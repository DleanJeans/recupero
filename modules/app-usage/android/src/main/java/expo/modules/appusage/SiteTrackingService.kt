package expo.modules.appusage

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.ComponentName
import android.content.Context
import android.provider.Settings
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import org.json.JSONArray
import org.json.JSONObject

/**
 * Two jobs share this one accessibility service, so the user only has to turn on one:
 * - "Open <app>" reminders: every app switch is passed to [AppOpenWatcher]. While any such
 *   reminder exists the service listens to all apps; otherwise only to Firefox.
 * - Website tracking (below).
 *
 * Watches Firefox's address bar and records a "mark" each time the shown site changes.
 * A mark is (timestamp, host); an empty host means Firefox showed a page with no site
 * (new tab, home). Time per site is worked out in JS by combining marks with Firefox's
 * foreground sessions from UsageStatsManager, so this service never needs to know when
 * Firefox leaves the screen.
 */
class SiteTrackingService : AccessibilityService() {
  private var lastCheckAt = 0L

  override fun onServiceConnected() {
    super.onServiceConnected()
    instance = this
    applyPackageFilter()
  }

  override fun onDestroy() {
    if (instance === this) instance = null
    super.onDestroy()
  }

  /** All apps while an app-open reminder exists (to see app switches), else just Firefox. */
  private fun applyPackageFilter() {
    val info = serviceInfo ?: return
    val watchesApps = AppOpenWatcher.watchedPackages(this).isNotEmpty()
    info.packageNames = if (watchesApps) null else FIREFOX_PACKAGES.toTypedArray()
    info.eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED
    info.flags = info.flags or AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS
    serviceInfo = info
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event == null) return
    val isWindowChange = event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
    val eventPackage = event.packageName?.toString()
    if (isWindowChange && eventPackage != null) {
      AppOpenWatcher.onWindowChanged(this, eventPackage, event.className?.toString())
    }
    // Everything below is website tracking, which only cares about Firefox.
    if (eventPackage != null && eventPackage !in FIREFOX_PACKAGES) return
    val now = System.currentTimeMillis()
    // Content changes fire constantly while scrolling; one look per second is plenty.
    if (!isWindowChange && now - lastCheckAt < 1000) return
    lastCheckAt = now

    val root = rootInActiveWindow ?: return
    val packageName = root.packageName?.toString() ?: return
    if (packageName !in FIREFOX_PACKAGES) return
    val found = findUrlText(root, packageName)
    if (found == null) {
      SiteDebug.record(this, now, packageName, null, null, null, dumpCandidates(root))
      return
    }
    val host = hostFromUrlText(found.text)
    SiteDebug.record(this, now, packageName, found.source, found.text, host, null)
    SiteMarks.record(this, now, host, force = isWindowChange)
  }

  override fun onInterrupt() = Unit

  private class UrlFound(val text: String, val source: String)

  private fun findUrlText(root: AccessibilityNodeInfo, packageName: String): UrlFound? {
    for (id in URL_VIEW_IDS) {
      val nodes = root.findAccessibilityNodeInfosByViewId("$packageName:id/$id")
      val text = nodes.firstOrNull()?.text?.toString()
      if (text != null) return UrlFound(text, id)
    }
    // Newer Firefox (and forks) renamed or rebuilt the toolbar: look for any toolbar-ish node showing a site.
    var result: UrlFound? = null
    walk(root) { node, _ ->
      if (result != null) return@walk true
      val id = node.viewIdResourceName?.substringAfter(":id/").orEmpty()
      val label = (node.text ?: node.contentDescription)?.toString()?.trim().orEmpty()
      if (label.isEmpty() || label.length > 300 || label.contains(' ')) return@walk true
      val idLooksLikeUrl = URL_ID_HINTS.any { id.contains(it, ignoreCase = true) }
      if (idLooksLikeUrl && hostFromUrlText(label).isNotEmpty()) {
        result = UrlFound(label, id.ifEmpty { "(fallback)" })
      } else if (id.isEmpty() && !node.isEditable && hostFromUrlText(label).isNotEmpty() && looksLikeUrlText(label)) {
        result = UrlFound(label, "(text scan)")
      }
      true
    }
    return result
  }

  /** Bare "reddit.com" or a full URL. Rejects things like "file.txt" or "1.5" that happen to match a host. */
  private fun looksLikeUrlText(label: String): Boolean {
    if (label.contains("://")) return true
    val host = hostFromUrlText(label)
    val tld = host.substringAfterLast('.')
    return tld.length in 2..24 && tld.all { it.isLetter() }
  }

  /** Depth-first walk over the window, skipping web page content. Stops after [MAX_NODES]. */
  private fun walk(root: AccessibilityNodeInfo, visit: (AccessibilityNodeInfo, Int) -> Boolean) {
    var count = 0
    fun step(node: AccessibilityNodeInfo, depth: Int) {
      if (count++ >= MAX_NODES || depth > 25) return
      val cls = node.className?.toString().orEmpty()
      if (cls.contains("GeckoView") || cls.contains("WebView") || cls.contains("SurfaceView")) return
      if (!visit(node, depth)) return
      for (i in 0 until node.childCount) {
        val child = node.getChild(i) ?: continue
        step(child, depth + 1)
      }
    }
    step(root, 0)
  }

  /** What the toolbar looks like when no URL was found: text-bearing nodes outside the web page, for the debug view. */
  private fun dumpCandidates(root: AccessibilityNodeInfo): String {
    val lines = mutableListOf<String>()
    walk(root) { node, depth ->
      val label = (node.text ?: node.contentDescription)?.toString()?.trim().orEmpty()
      if (label.isNotEmpty() && lines.size < 25) {
        val id = node.viewIdResourceName?.substringAfter(":id/") ?: "-"
        val cls = node.className?.toString()?.substringAfterLast('.') ?: "?"
        lines.add("$id | $cls | ${label.take(80)}")
      }
      true
    }
    return lines.joinToString("\n")
  }

  companion object {
    private var instance: SiteTrackingService? = null

    /** Re-applies the package filter after the app-open reminders change. */
    fun refreshPackageFilter() {
      instance?.applyPackageFilter()
    }

    val FIREFOX_PACKAGES = setOf(
      "org.mozilla.firefox",
      "org.mozilla.firefox_beta",
      "org.mozilla.fenix",
      "org.mozilla.fennec_fdroid",
      "io.github.forkmaintainers.iceraven",
      "us.spotco.fennec_dos",
      "io.gitlab.librewolf",
      "io.gitlab.librewolf_community",
      "org.torproject.torbrowser",
    )

    private const val MAX_NODES = 600

    // Display (not edit) views of the toolbar; Firefox has used several names over the years.
    private val URL_VIEW_IDS = listOf(
      "mozac_browser_toolbar_url_view",
      "mozac_browser_toolbar_origin_view",
      "url_bar_title",
      "toolbar_url",
    )
    private val URL_ID_HINTS = listOf("url", "origin", "address")

    private val HOST_PATTERN = Regex("^[a-z0-9-]+(\\.[a-z0-9-]+)+$")

    /** "https://www.YouTube.com/watch?v=1" -> "youtube.com"; anything that isn't a site -> "". */
    fun hostFromUrlText(text: String): String {
      var value = text.trim().lowercase()
      value = value.substringAfter("://")
      value = value.substringBefore('/').substringBefore('?').substringBefore('#').substringBefore(':')
      value = value.removePrefix("www.")
      return if (HOST_PATTERN.matches(value)) value else ""
    }

    fun isEnabled(context: Context): Boolean {
      val enabled = Settings.Secure.getString(
        context.contentResolver,
        Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES,
      ) ?: return false
      val component = ComponentName(context, SiteTrackingService::class.java)
      return enabled.split(':').any { ComponentName.unflattenFromString(it) == component }
    }
  }
}

/** The last thing the watcher read from Firefox, so the app can show why a site was or wasn't seen. */
object SiteDebug {
  private const val PREFS = "recupero_site_debug"

  fun record(
    context: Context,
    timestamp: Long,
    packageName: String,
    source: String?,
    rawText: String?,
    host: String?,
    candidates: String?,
  ) {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val json = JSONObject()
      .put("time", timestamp)
      .put("package", packageName)
      .put("source", source ?: JSONObject.NULL)
      .put("text", rawText ?: JSONObject.NULL)
      .put("host", host ?: JSONObject.NULL)
      .put("candidates", candidates ?: JSONObject.NULL)
    prefs.edit().putString("last", json.toString()).apply()
  }

  fun read(context: Context): String =
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("last", "") ?: ""
}

/** Site marks kept in SharedPreferences for about a week, matching Android's usage event retention. */
object SiteMarks {
  private const val PREFS = "recupero_site_marks"
  private const val KEY = "marks"
  private const val MAX_AGE_MS = 8L * 24 * 60 * 60 * 1000
  private const val MAX_MARKS = 5000

  private var lastHost: String? = null

  @Synchronized
  fun record(context: Context, timestamp: Long, host: String, force: Boolean) {
    if (!force && host == lastHost) return
    lastHost = host
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val existing = JSONArray(prefs.getString(KEY, "[]"))
    val next = JSONArray()
    val cutoff = timestamp - MAX_AGE_MS
    val start = maxOf(0, existing.length() - MAX_MARKS + 1)
    for (i in start until existing.length()) {
      val mark = existing.getJSONObject(i)
      if (mark.getLong("t") >= cutoff) next.put(mark)
    }
    next.put(JSONObject().put("t", timestamp).put("h", host))
    prefs.edit().putString(KEY, next.toString()).apply()
  }

  @Synchronized
  fun read(context: Context, start: Long, end: Long): List<Map<String, Any>> {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val marks = JSONArray(prefs.getString(KEY, "[]"))
    val result = mutableListOf<Map<String, Any>>()
    for (i in 0 until marks.length()) {
      val mark = marks.getJSONObject(i)
      val t = mark.getLong("t")
      if (t in start..end) result.add(mapOf("timestamp" to t.toDouble(), "host" to mark.getString("h")))
    }
    return result
  }
}
