package expo.modules.appusage

import android.content.Context
import android.provider.Settings
import android.util.Log
import expo.modules.notifications.notifications.model.NotificationContent
import expo.modules.notifications.notifications.model.NotificationRequest
import expo.modules.notifications.notifications.triggers.ChannelAwareTrigger
import expo.modules.notifications.service.NotificationsService
import org.json.JSONArray
import org.json.JSONObject

/**
 * "Open <app>" reminders. JS hands over one ready-made notification per watched app (see
 * src/utils/app-open-watches.ts); when the accessibility service sees that app come to the
 * foreground, this posts it through expo-notifications so its buttons (Start timer, Later)
 * run the same background task as every other reminder, even with Recupero closed.
 */
object AppOpenWatcher {
  private const val TAG = "RecuperoAppOpen"
  private const val PREFS = "recupero_app_open"
  private const val KEY_WATCHES = "watches"
  private const val KEY_LAST_FIRED = "last_fired"
  /** Same as REMINDER_COOLDOWN_MS in reminder-utils.ts: leaving and coming back soon after doesn't nag again. */
  private const val COOLDOWN_MS = 15L * 60 * 1000

  /** Window changes from these never count as "the user switched apps". */
  private val IGNORED_PACKAGES = setOf("com.android.systemui", "android")

  private var lastForegroundPackage: String? = null
  private var cachedWatches: List<Watch>? = null

  private data class Watch(
    val cueId: String,
    val packageName: String,
    val title: String,
    val body: String,
    val data: String,
    val categoryIdentifier: String?,
    val channelId: String,
  )

  fun setWatches(context: Context, json: String) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY_WATCHES, json).apply()
    cachedWatches = null
  }

  fun watchedPackages(context: Context): Set<String> = readWatches(context).map { it.packageName }.toSet()

  /** Called for every window change. Fires only when the foreground app actually changes to a watched one. */
  fun onWindowChanged(context: Context, packageName: String, className: String?) {
    if (packageName in IGNORED_PACKAGES) return
    if (className?.contains("inputmethod", ignoreCase = true) == true) return
    if (packageName == defaultInputMethodPackage(context)) return
    if (packageName == lastForegroundPackage) return
    lastForegroundPackage = packageName

    val watches = readWatches(context).filter { it.packageName == packageName }
    if (watches.isEmpty()) return
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val lastFired = JSONObject(prefs.getString(KEY_LAST_FIRED, "{}") ?: "{}")
    val now = System.currentTimeMillis()
    for (watch in watches) {
      if (now - lastFired.optLong(watch.cueId, 0L) < COOLDOWN_MS) continue
      try {
        post(context, watch, now)
        lastFired.put(watch.cueId, now)
      } catch (error: Exception) {
        Log.w(TAG, "Could not post app-open reminder", error)
      }
    }
    prefs.edit().putString(KEY_LAST_FIRED, lastFired.toString()).apply()
  }

  private fun post(context: Context, watch: Watch, now: Long) {
    val builder = NotificationContent.Builder()
      .setTitle(watch.title)
      .setText(watch.body)
      .setBody(JSONObject(watch.data))
      .setAutoDismiss(true)
    watch.categoryIdentifier?.let { builder.setCategoryId(it) }
    val request = NotificationRequest(
      "reminder-app:${watch.cueId}:$now",
      builder.build(),
      ChannelAwareTrigger(watch.channelId),
    )
    NotificationsService.schedule(context, request)
  }

  private fun readWatches(context: Context): List<Watch> {
    cachedWatches?.let { return it }
    val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_WATCHES, "[]") ?: "[]"
    val parsed = try {
      val array = JSONArray(raw)
      (0 until array.length()).map { index ->
        val item = array.getJSONObject(index)
        Watch(
          cueId = item.getString("cueId"),
          packageName = item.getString("packageName"),
          title = item.optString("title"),
          body = item.optString("body"),
          data = item.optString("data", "{}"),
          categoryIdentifier = if (item.isNull("categoryIdentifier")) null else item.optString("categoryIdentifier"),
          channelId = item.optString("channelId", "reminders"),
        )
      }
    } catch (error: Exception) {
      Log.w(TAG, "Bad app-open watches", error)
      emptyList()
    }
    cachedWatches = parsed
    return parsed
  }

  private fun defaultInputMethodPackage(context: Context): String? =
    Settings.Secure.getString(context.contentResolver, Settings.Secure.DEFAULT_INPUT_METHOD)
      ?.substringBefore('/')
}
