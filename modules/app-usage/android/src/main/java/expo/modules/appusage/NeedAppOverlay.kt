package expo.modules.appusage

import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject

/**
 * Shows the floating timer when an app that helps a need (see src/utils/need-app-overlay-utils.ts) comes to the
 * foreground, and takes it away when another app does. JS hands over the app list; the accessibility service
 * reports app switches through [onForegroundChanged], so this works with Recupero closed. It only draws;
 * the time itself is still logged afterwards from Android's usage events.
 */
object NeedAppOverlay {
  private const val TAG = "RecuperoNeedOverlay"
  private const val PREFS = "recupero_need_app_overlay"
  private const val KEY_WATCHES = "watches"
  /** Leaving and coming back within this long continues the same timer, like merged app sessions. */
  private const val RESUME_GRACE_MS = 2L * 60 * 1000

  private var cachedWatches: Map<String, JSONObject>? = null
  private var activePackage: String? = null
  private var activeStart = 0L
  private var leftPackage: String? = null
  private var leftAt = 0L

  fun setWatches(context: Context, json: String) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY_WATCHES, json).apply()
    cachedWatches = null
  }

  fun watchedPackages(context: Context): Set<String> = readWatches(context).keys

  /** Called when the foreground app changes (never for the keyboard or system UI). */
  fun onForegroundChanged(context: Context, packageName: String) {
    val watch = readWatches(context)[packageName]
    val previous = activePackage
    if (previous != null && previous != packageName) {
      leftPackage = previous
      leftAt = System.currentTimeMillis()
    }
    if (watch == null) {
      if (previous != null) {
        activePackage = null
        send(context, Intent(context, TimerOverlayService::class.java).setAction(TimerOverlayService.ACTION_APP_LEAVE), false)
      }
      return
    }
    val now = System.currentTimeMillis()
    val resumed = leftPackage == packageName && now - leftAt < RESUME_GRACE_MS && activeStart > 0
    activePackage = packageName
    if (!resumed) activeStart = now
    val intent = Intent(context, TimerOverlayService::class.java)
      .setAction(TimerOverlayService.ACTION_APP_ENTER)
      .putExtra(TimerOverlayService.EXTRA_APP_PACKAGE, packageName)
      .putExtra(TimerOverlayService.EXTRA_APP_JSON, watch.toString())
      .putExtra(TimerOverlayService.EXTRA_APP_START, activeStart)
    send(context, intent, true)
  }

  private fun send(context: Context, intent: Intent, start: Boolean) {
    try {
      if (!start && TimerOverlayService.instance == null) return
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && start) context.startForegroundService(intent) else context.startService(intent)
    } catch (error: Exception) {
      Log.w(TAG, "Could not reach the timer overlay", error)
    }
  }

  private fun readWatches(context: Context): Map<String, JSONObject> {
    cachedWatches?.let { return it }
    val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_WATCHES, "[]") ?: "[]"
    val parsed = try {
      val array = JSONArray(raw)
      (0 until array.length()).associate { index ->
        val item = array.getJSONObject(index)
        item.getString("packageName") to item
      }
    } catch (error: Exception) {
      Log.w(TAG, "Bad need app watches", error)
      emptyMap()
    }
    cachedWatches = parsed
    return parsed
  }
}
