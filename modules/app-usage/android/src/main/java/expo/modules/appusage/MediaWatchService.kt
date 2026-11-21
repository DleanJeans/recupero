package expo.modules.appusage

import android.content.ComponentName
import android.content.Context
import android.media.session.MediaController
import android.media.session.MediaSessionManager
import android.media.session.PlaybackState
import android.app.Notification
import android.provider.Settings
import android.service.notification.StatusBarNotification
import android.service.notification.NotificationListenerService
import org.json.JSONArray
import org.json.JSONObject

/**
 * Notices when other apps start or stop playing media (music, video) through their media session, so time
 * spent listening in the background can fill a need. Needs the user to turn on Notification access; it
 * reads only playback state, never notification text.
 */
class MediaWatchService : NotificationListenerService() {
  private var manager: MediaSessionManager? = null
  private val controllers = mutableMapOf<String, MediaController>()
  private val callbacks = mutableMapOf<String, MediaController.Callback>()
  private val listener = MediaSessionManager.OnActiveSessionsChangedListener { list -> watch(list ?: emptyList()) }

  override fun onListenerConnected() {
    super.onListenerConnected()
    val sessions = getSystemService(Context.MEDIA_SESSION_SERVICE) as MediaSessionManager
    manager = sessions
    val component = ComponentName(this, MediaWatchService::class.java)
    try {
      sessions.addOnActiveSessionsChangedListener(listener, component)
      watch(sessions.getActiveSessions(component))
    } catch (e: SecurityException) {
      // Notification access was revoked while connecting.
    }
  }

  override fun onListenerDisconnected() {
    manager?.removeOnActiveSessionsChangedListener(listener)
    controllers.forEach { (pkg, controller) -> callbacks[pkg]?.let { controller.unregisterCallback(it) } }
    controllers.clear()
    callbacks.clear()
    super.onListenerDisconnected()
  }

  /** Notes who a WhatsApp or Messenger notification is from (title only, never the message text). */
  override fun onNotificationPosted(sbn: StatusBarNotification?) {
    val notification = sbn?.notification ?: return
    if (sbn.packageName !in ChatEvents.PACKAGES) return
    if (notification.flags and Notification.FLAG_GROUP_SUMMARY != 0) return
    val title = notification.extras?.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: return
    ChatEvents.record(this, sbn.packageName, title, sbn.postTime)
  }

  private fun watch(active: List<MediaController>) {
    val seen = mutableSetOf<String>()
    for (controller in active) {
      val pkg = controller.packageName
      seen.add(pkg)
      if (controllers[pkg]?.sessionToken == controller.sessionToken) continue
      callbacks[pkg]?.let { controllers[pkg]?.unregisterCallback(it) }
      val callback = object : MediaController.Callback() {
        override fun onPlaybackStateChanged(state: PlaybackState?) {
          MediaEvents.record(this@MediaWatchService, pkg, state?.state == PlaybackState.STATE_PLAYING)
        }
      }
      controller.registerCallback(callback)
      controllers[pkg] = controller
      callbacks[pkg] = callback
      MediaEvents.record(this, pkg, controller.playbackState?.state == PlaybackState.STATE_PLAYING)
    }
    for (pkg in controllers.keys.toList()) {
      if (pkg in seen) continue
      callbacks[pkg]?.let { controllers[pkg]?.unregisterCallback(it) }
      controllers.remove(pkg)
      callbacks.remove(pkg)
      MediaEvents.record(this, pkg, false)
    }
  }

  companion object {
    fun isEnabled(context: Context): Boolean {
      val enabled = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners")
        ?: return false
      val component = ComponentName(context, MediaWatchService::class.java)
      return enabled.split(':').any { ComponentName.unflattenFromString(it) == component }
    }
  }
}

/** Play/pause changes kept in SharedPreferences for about a week. */
object MediaEvents {
  private const val PREFS = "recupero_media_events"
  private const val KEY = "events"
  private const val MAX_AGE_MS = 8L * 24 * 60 * 60 * 1000
  private const val MAX_EVENTS = 5000
  private val lastState = mutableMapOf<String, Boolean>()

  @Synchronized
  fun record(context: Context, packageName: String, playing: Boolean) {
    if (lastState[packageName] == playing) return
    lastState[packageName] = playing
    val now = System.currentTimeMillis()
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val existing = JSONArray(prefs.getString(KEY, "[]"))
    val next = JSONArray()
    val start = maxOf(0, existing.length() - MAX_EVENTS + 1)
    for (i in start until existing.length()) {
      val event = existing.getJSONObject(i)
      if (event.getLong("t") >= now - MAX_AGE_MS) next.put(event)
    }
    next.put(JSONObject().put("t", now).put("p", packageName).put("on", playing))
    prefs.edit().putString(KEY, next.toString()).apply()
  }

  @Synchronized
  fun read(context: Context, start: Long, end: Long): List<Map<String, Any>> {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val events = JSONArray(prefs.getString(KEY, "[]"))
    val result = mutableListOf<Map<String, Any>>()
    for (i in 0 until events.length()) {
      val event = events.getJSONObject(i)
      val t = event.getLong("t")
      if (t in start..end) {
        result.add(mapOf("timestamp" to t.toDouble(), "packageName" to event.getString("p"), "playing" to event.getBoolean("on")))
      }
    }
    return result
  }
}

/** Who messaged you in a chat app (names only, no message text), kept in SharedPreferences for about a week. */
object ChatEvents {
  val PACKAGES = setOf("com.whatsapp", "com.whatsapp.w4b", "com.facebook.orca", "com.facebook.mlite")
  private const val PREFS = "recupero_chat_events"
  private const val KEY = "events"
  private const val MAX_AGE_MS = 8L * 24 * 60 * 60 * 1000
  private const val MAX_EVENTS = 2000

  @Synchronized
  fun record(context: Context, packageName: String, title: String, time: Long) {
    // WhatsApp posts a summary titled "WhatsApp" or "N new messages"; those are not a person.
    if (title.isBlank() || title == "WhatsApp" || title == "Messenger" || title.endsWith("new messages")) return
    val now = System.currentTimeMillis()
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val existing = JSONArray(prefs.getString(KEY, "[]"))
    val next = JSONArray()
    val start = maxOf(0, existing.length() - MAX_EVENTS + 1)
    for (i in start until existing.length()) {
      val event = existing.getJSONObject(i)
      if (event.getLong("t") >= now - MAX_AGE_MS) next.put(event)
    }
    next.put(JSONObject().put("t", time).put("p", packageName).put("title", title))
    prefs.edit().putString(KEY, next.toString()).apply()
  }

  @Synchronized
  fun read(context: Context, start: Long, end: Long): List<Map<String, Any>> {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val events = JSONArray(prefs.getString(KEY, "[]"))
    val result = mutableListOf<Map<String, Any>>()
    for (i in 0 until events.length()) {
      val event = events.getJSONObject(i)
      val t = event.getLong("t")
      if (t in start..end) {
        result.add(mapOf("timestamp" to t.toDouble(), "packageName" to event.getString("p"), "title" to event.getString("title")))
      }
    }
    return result
  }
}
