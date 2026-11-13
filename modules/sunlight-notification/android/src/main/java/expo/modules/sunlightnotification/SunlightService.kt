package expo.modules.sunlightnotification

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import org.json.JSONObject
import java.text.NumberFormat
import java.util.Locale

/**
 * Foreground service behind the live sunlight notification: re-posts it every second with the light dose
 * and minutes counted up from the plan JS hands over (rates per hour from the weather), until arrival,
 * sunset or the plan's stop time. Re-posting also brings it back if it is swiped away (Android 14+ lets
 * users dismiss even ongoing notifications).
 */
class SunlightService : Service() {
  private val handler = Handler(Looper.getMainLooper())
  private var plan: Plan? = null
  private val tick = object : Runnable {
    override fun run() {
      val current = plan ?: return
      val now = System.currentTimeMillis()
      if (now >= current.stopAt) {
        stopSelfCleanly()
        return
      }
      notificationManager().notify(NOTIFICATION_ID, buildNotification(this@SunlightService, current, now))
      handler.postDelayed(this, TICK_MS)
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val parsed = intent?.getStringExtra(EXTRA_PLAN)?.let { Plan.parse(it) }
    if (parsed == null) {
      stopSelfCleanly()
      return START_NOT_STICKY
    }
    plan = parsed
    ensureChannel(this)
    val notification = buildNotification(this, parsed, System.currentTimeMillis())
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
      } else {
        startForeground(NOTIFICATION_ID, notification)
      }
    } catch (error: Exception) {
      // Still show it (without live ticking) rather than crash.
      Log.w(TAG, "startForeground refused", error)
      notificationManager().notify(NOTIFICATION_ID, notification)
      handler.removeCallbacks(tick)
      plan = null
      stopSelf()
      return START_NOT_STICKY
    }
    handler.removeCallbacks(tick)
    handler.postDelayed(tick, TICK_MS)
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    handler.removeCallbacks(tick)
    super.onDestroy()
  }

  private fun stopSelfCleanly() {
    handler.removeCallbacks(tick)
    plan = null
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      stopForeground(STOP_FOREGROUND_REMOVE)
    } else {
      @Suppress("DEPRECATION")
      stopForeground(true)
    }
    notificationManager().cancel(NOTIFICATION_ID)
    stopSelf()
  }

  private fun notificationManager() = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

  /** Everything JS worked out; the service only adds elapsed time. */
  class Plan(
    val snapshotAt: Long,
    val luxMinutes: Double,
    val minutes: Double,
    val target: Double,
    val goalMinutes: Double,
    val outSince: Long,
    val stopAt: Long,
    /** Eye-level lux per minute, each valid until `until` (hour ends). */
    val rates: List<Pair<Long, Double>>,
  ) {
    /** Dose at `now`: the snapshot plus each hour's rate for the minutes since the snapshot. */
    fun luxMinutesAt(now: Long): Double {
      var total = luxMinutes
      var from = snapshotAt
      for ((until, perMinute) in rates) {
        if (from >= now) break
        val end = minOf(until, now)
        if (end > from) total += perMinute * (end - from) / MS_PER_MINUTE
        from = maxOf(from, until)
      }
      return total
    }

    fun minutesAt(now: Long): Double = minutes + (now - snapshotAt).coerceAtLeast(0) / MS_PER_MINUTE

    companion object {
      fun parse(json: String): Plan? = try {
        val obj = JSONObject(json)
        val rateArray = obj.optJSONArray("rates")
        val rates = mutableListOf<Pair<Long, Double>>()
        if (rateArray != null) {
          for (i in 0 until rateArray.length()) {
            val rate = rateArray.getJSONObject(i)
            rates.add(rate.getDouble("until").toLong() to rate.getDouble("perMinute"))
          }
        }
        Plan(
          snapshotAt = obj.getDouble("snapshotAt").toLong(),
          luxMinutes = obj.getDouble("luxMinutes"),
          minutes = obj.getDouble("minutes"),
          target = obj.getDouble("target"),
          goalMinutes = obj.getDouble("goalMinutes"),
          outSince = obj.getDouble("outSince").toLong(),
          stopAt = obj.getDouble("stopAt").toLong(),
          rates = rates,
        )
      } catch (error: Exception) {
        Log.w(TAG, "Bad sunlight plan", error)
        null
      }
    }
  }

  companion object {
    private const val TAG = "RecuperoSunlight"
    private const val EXTRA_PLAN = "plan"
    private const val CHANNEL_ID = "recupero-sunlight"
    private const val NOTIFICATION_ID = 0x5017
    private const val TICK_MS = 1000L
    private const val MS_PER_MINUTE = 60_000.0
    private const val PROGRESS_MAX = 1000

    fun start(context: Context, json: String): Boolean {
      // Never launch the service with a plan it can't read: it would have to stop before startForeground.
      if (Plan.parse(json) == null) return false
      val intent = Intent(context, SunlightService::class.java).putExtra(EXTRA_PLAN, json)
      return try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent)
        else context.startService(intent)
        true
      } catch (error: Exception) {
        // Android 12+ may refuse a foreground service started from the background
        // (ForegroundServiceStartNotAllowedException). Show a still notification instead; the
        // system chronometer in it keeps counting the time outside.
        Log.w(TAG, "Couldn't start the sunlight service", error)
        Plan.parse(json)?.let { plan ->
          ensureChannel(context)
          (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
            .notify(NOTIFICATION_ID, buildNotification(context, plan, System.currentTimeMillis()))
        }
        false
      }
    }

    fun stop(context: Context) {
      context.stopService(Intent(context, SunlightService::class.java))
      (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).cancel(NOTIFICATION_ID)
    }

    private fun ensureChannel(context: Context) {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
      val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      if (manager.getNotificationChannel(CHANNEL_ID) != null) return
      val channel = NotificationChannel(CHANNEL_ID, "Sunlight (live)", NotificationManager.IMPORTANCE_LOW).apply {
        description = "Counts up your time and light dose while you're outside in daylight"
        setShowBadge(false)
      }
      manager.createNotificationChannel(channel)
    }

    private fun smallIcon(context: Context): Int {
      val id = context.resources.getIdentifier("notification_icon", "drawable", context.packageName)
      return if (id != 0) id else context.applicationInfo.icon
    }

    private fun openAppIntent(context: Context): PendingIntent? {
      val launch = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return null
      return PendingIntent.getActivity(
        context,
        NOTIFICATION_ID,
        launch,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
    }

    fun buildNotification(context: Context, plan: Plan, now: Long): Notification {
      val format = NumberFormat.getIntegerInstance(Locale.US)
      val dose = plan.luxMinutesAt(now)
      val minutes = plan.minutesAt(now).toInt()
      val ratio = if (plan.target > 0) (dose / plan.target).coerceIn(0.0, 1.0) else 0.0
      val percent = if (plan.target > 0) dose / plan.target * 100 else 0.0
      val title = "☀️ Sunlight · $minutes / ${plan.goalMinutes.toInt()} min"
      val text = "${format.format(dose.toLong())} / ${format.format(plan.target.toLong())} lux·min · " +
        String.format(Locale.US, "%.1f%%", percent)
      return NotificationCompat.Builder(context, CHANNEL_ID)
        .setSmallIcon(smallIcon(context))
        .setContentTitle(title)
        .setContentText(text)
        .setSubText("Counting while you're outside")
        .setProgress(PROGRESS_MAX, (ratio * PROGRESS_MAX).toInt(), false)
        .setWhen(plan.outSince)
        .setShowWhen(true)
        .setUsesChronometer(true)
        .setOngoing(true)
        .setOnlyAlertOnce(true)
        .setSilent(true)
        .setCategory(NotificationCompat.CATEGORY_PROGRESS)
        .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
        .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
        .setContentIntent(openAppIntent(context))
        .build()
    }
  }
}
