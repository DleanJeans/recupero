package expo.modules.appusage

import android.accessibilityservice.AccessibilityService
import android.content.ComponentName
import android.content.Context
import android.provider.Settings
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import org.json.JSONArray
import org.json.JSONObject

/**
 * Watches Firefox's address bar and records a "mark" each time the shown site changes.
 * A mark is (timestamp, host); an empty host means Firefox showed a page with no site
 * (new tab, home). Time per site is worked out in JS by combining marks with Firefox's
 * foreground sessions from UsageStatsManager, so this service never needs to know when
 * Firefox leaves the screen.
 */
class SiteTrackingService : AccessibilityService() {
  private var lastCheckAt = 0L

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event == null) return
    val isWindowChange = event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
    val now = System.currentTimeMillis()
    // Content changes fire constantly while scrolling; one look per second is plenty.
    if (!isWindowChange && now - lastCheckAt < 1000) return
    lastCheckAt = now

    val root = rootInActiveWindow ?: return
    val packageName = root.packageName?.toString() ?: return
    if (packageName !in FIREFOX_PACKAGES) return
    val urlText = findUrlText(root, packageName) ?: return
    SiteMarks.record(this, now, hostFromUrlText(urlText), force = isWindowChange)
  }

  override fun onInterrupt() = Unit

  private fun findUrlText(root: AccessibilityNodeInfo, packageName: String): String? {
    for (id in URL_VIEW_IDS) {
      val nodes = root.findAccessibilityNodeInfosByViewId("$packageName:id/$id")
      val text = nodes.firstOrNull()?.text?.toString()
      if (text != null) return text
    }
    return null
  }

  companion object {
    val FIREFOX_PACKAGES = setOf("org.mozilla.firefox", "org.mozilla.firefox_beta", "org.mozilla.fenix")

    // Display (not edit) views of the toolbar; Firefox has used both over the years.
    private val URL_VIEW_IDS = listOf("mozac_browser_toolbar_url_view", "url_bar_title")

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
