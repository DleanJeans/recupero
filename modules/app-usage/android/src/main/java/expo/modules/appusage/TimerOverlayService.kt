package expo.modules.appusage

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.util.Log
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView
import org.json.JSONArray

/**
 * Floating timer pill drawn over other apps while a Recupero timer runs and Recupero itself is in the
 * background. It is a foreground service so Android keeps it alive; JS hands over the running timers and
 * says when to show or hide it. Drag to move, tap to open Recupero.
 */
class TimerOverlayService : Service() {
  /** A need the timer is filling: its level at `at`, and how long from `at` until it is full. */
  private class Fill(val emoji: String, val label: String, val level: Double, val fullInMs: Double, val at: Long)

  /** The behavior's level before this timer started: XP into the level and the level's size (1 XP per timer minute). */
  private class Level(val inLevel: Double, val forLevel: Double)

  private class Timer(val name: String, val start: Long, val fill: Fill?, val icon: String?, val level: Level?, val note: String?)

  /** One timer's bubble: a ring (need fill, else level) around the icon, the time, and the name underneath. */
  private class Bubble(val root: LinearLayout, val ring: RingView, val time: TextView, val name: TextView)


  private val handler = Handler(Looper.getMainLooper())
  private var timers: List<Timer> = emptyList()
  private var windowManager: WindowManager? = null
  private var container: LinearLayout? = null
  private val bubbles = mutableListOf<Bubble>()
  private var params: WindowManager.LayoutParams? = null
  private var wantVisible = false
  private var attached = false
  private var dismissed = false
  private var lastNotificationText = ""
  private var posX = 0
  private var posY = 0

  private val tick = object : Runnable {
    override fun run() {
      render()
      handler.postDelayed(this, 1000)
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    instance = this
    windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
    posX = dp(16)
    posY = dp(140)
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_SHOW) {
      dismissed = false
      wantVisible = true
      handler.post { render() }
      return START_NOT_STICKY
    }
    val json = intent?.getStringExtra(EXTRA_TIMERS)
    if (json == null) {
      stopSelf()
      return START_NOT_STICKY
    }
    timers = parse(json)
    if (intent.hasExtra(EXTRA_VISIBLE)) {
      val visible = intent.getBooleanExtra(EXTRA_VISIBLE, false)
      // Coming back to Recupero ends a swipe-dismiss; the pill is allowed again next time it leaves.
      if (!visible) dismissed = false
      wantVisible = visible
    }
    if (timers.isEmpty()) {
      stopSelf()
      return START_NOT_STICKY
    }
    try {
      val notification = buildNotification()
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
      } else {
        startForeground(NOTIFICATION_ID, notification)
      }
    } catch (error: Exception) {
      Log.w(TAG, "startForeground refused", error)
      stopSelf()
      return START_NOT_STICKY
    }
    handler.removeCallbacks(tick)
    handler.post(tick)
    return START_NOT_STICKY
  }

  fun setVisible(visible: Boolean) {
    if (!visible) dismissed = false
    wantVisible = visible
    handler.post { render() }
  }

  private fun render() {
    val show = wantVisible && !dismissed && timers.isNotEmpty() && Settings.canDrawOverlays(this)
    if (!show) {
      detach()
      return
    }
    val view = container ?: buildView().also { container = it }
    if (bubbles.size != timers.size) {
      view.removeAllViews()
      bubbles.clear()
      for (index in timers.indices) {
        val bubble = bubble()
        if (index > 0) (bubble.root.layoutParams as LinearLayout.LayoutParams).topMargin = dp(6)
        view.addView(bubble.root)
        bubbles.add(bubble)
      }
    }
    val now = System.currentTimeMillis()
    for (index in timers.indices) {
      val timer = timers[index]
      val bubble = bubbles[index]
      val elapsed = now - timer.start
      bubble.ring.emoji = timer.icon ?: timer.fill?.emoji ?: "⏱"
      bubble.ring.share = ringShare(timer, now, elapsed)
      bubble.ring.invalidate()
      bubble.time.text = format(elapsed)
      // The item being worked on (a Shopping task) beats the behavior's name.
      bubble.name.text = timer.note ?: timer.name
    }
    refreshNotification(now)
    if (!attached) {
      val layout = WindowManager.LayoutParams(
        WindowManager.LayoutParams.WRAP_CONTENT,
        WindowManager.LayoutParams.WRAP_CONTENT,
        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
        PixelFormat.TRANSLUCENT,
      )
      layout.gravity = Gravity.TOP or Gravity.START
      layout.x = posX
      layout.y = posY
      params = layout
      try {
        windowManager?.addView(view, layout)
        attached = true
      } catch (error: Exception) {
        Log.w(TAG, "overlay refused", error)
      }
    }
  }

  private fun levelNow(fill: Fill, now: Long): Double {
    if (fill.fullInMs <= 0) return 100.0
    val progress = Math.min(1.0, Math.max(0.0, (now - fill.at) / fill.fullInMs))
    return fill.level + (100.0 - fill.level) * progress
  }

  /** The need's level while it fills; without a need, progress through the behavior's current level. */
  private fun ringShare(timer: Timer, now: Long, elapsedMs: Long): Float {
    timer.fill?.let { return (levelNow(it, now) / 100.0).toFloat() }
    val level = timer.level ?: return 0f
    if (level.forLevel <= 0) return 0f
    val xp = level.inLevel + Math.max(0L, elapsedMs) / 60000.0
    return ((xp % level.forLevel) / level.forLevel).toFloat()
  }

  private fun notificationText(now: Long): String =
    timers.mapNotNull { timer ->
      timer.fill?.let { fill ->
        val left = Math.max(0.0, fill.fullInMs - (now - fill.at))
        val minutes = Math.round(left / 60000.0)
        "${fill.emoji} ${fill.label} ${Math.round(levelNow(fill, now))}%" +
          if (minutes > 0) " · full in ${minutes} min" else " · full"
      }
    }.joinToString("\n")

  private fun refreshNotification(now: Long) {
    val text = notificationText(now)
    if (text == lastNotificationText) return
    (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).notify(NOTIFICATION_ID, buildNotification())
  }

  private fun buildView(): LinearLayout {
    val view = LinearLayout(this)
    view.orientation = LinearLayout.VERTICAL
    view.setOnTouchListener(DragListener())
    return view
  }

  private fun bubble(): Bubble {
    val root = LinearLayout(this)
    root.orientation = LinearLayout.HORIZONTAL
    root.gravity = Gravity.CENTER_VERTICAL
    root.setPadding(dp(4), dp(4), dp(12), dp(4))
    val background = GradientDrawable()
    background.setColor(Color.parseColor("#E61E1E1E"))
    background.cornerRadius = dp(24).toFloat()
    background.setStroke(dp(1), GREEN)
    root.background = background
    root.layoutParams = LinearLayout.LayoutParams(
      LinearLayout.LayoutParams.WRAP_CONTENT,
      LinearLayout.LayoutParams.WRAP_CONTENT,
    )

    val ring = RingView(this)
    root.addView(ring, LinearLayout.LayoutParams(dp(36), dp(36)))

    val texts = LinearLayout(this)
    texts.orientation = LinearLayout.VERTICAL
    val textsParams = LinearLayout.LayoutParams(
      LinearLayout.LayoutParams.WRAP_CONTENT,
      LinearLayout.LayoutParams.WRAP_CONTENT,
    )
    textsParams.leftMargin = dp(8)
    root.addView(texts, textsParams)

    val time = TextView(this)
    time.setTextColor(GREEN)
    time.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
    time.typeface = android.graphics.Typeface.DEFAULT_BOLD
    time.fontFeatureSettings = "tnum"
    time.setSingleLine(true)
    texts.addView(time)

    val name = TextView(this)
    name.setTextColor(Color.parseColor("#9FD8B0"))
    name.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
    name.setSingleLine(true)
    name.maxWidth = dp(220)
    name.ellipsize = android.text.TextUtils.TruncateAt.END
    texts.addView(name)

    return Bubble(root, ring, time, name)
  }

  /** A progress ring around an emoji, filling clockwise from the top. */
  private class RingView(context: Context) : View(context) {
    var share = 0f
    var emoji = "⏱"
    private val density = context.resources.displayMetrics.density
    private val stroke = 3f * density
    private val track = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      style = Paint.Style.STROKE
      strokeWidth = stroke
      color = Color.parseColor("#33FFFFFF")
    }
    private val arc = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      style = Paint.Style.STROKE
      strokeWidth = stroke
      strokeCap = Paint.Cap.ROUND
      color = GREEN
    }
    private val text = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      textAlign = Paint.Align.CENTER
      textSize = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP, 17f, context.resources.displayMetrics)
    }
    private val bounds = RectF()

    override fun onDraw(canvas: Canvas) {
      super.onDraw(canvas)
      val inset = stroke / 2 + density
      bounds.set(inset, inset, width - inset, height - inset)
      canvas.drawOval(bounds, track)
      val sweep = 360f * share.coerceIn(0f, 1f)
      if (sweep > 0f) canvas.drawArc(bounds, -90f, sweep, false, arc)
      val baseline = height / 2f - (text.descent() + text.ascent()) / 2f
      canvas.drawText(emoji, width / 2f, baseline, text)
    }
  }

  private inner class DragListener : View.OnTouchListener {
    private var downX = 0f
    private var downY = 0f
    private var startX = 0
    private var startY = 0
    private var moved = false

    override fun onTouch(view: View, event: MotionEvent): Boolean {
      val layout = params ?: return false
      when (event.action) {
        MotionEvent.ACTION_DOWN -> {
          downX = event.rawX
          downY = event.rawY
          startX = layout.x
          startY = layout.y
          moved = false
        }
        MotionEvent.ACTION_MOVE -> {
          val dx = (event.rawX - downX).toInt()
          val dy = (event.rawY - downY).toInt()
          if (Math.abs(dx) > dp(6) || Math.abs(dy) > dp(6)) moved = true
          if (moved) {
            layout.x = startX + dx
            layout.y = startY + dy
            posX = layout.x
            posY = layout.y
            windowManager?.updateViewLayout(view, layout)
          }
        }
        MotionEvent.ACTION_UP -> {
          if (moved && startY - layout.y > dp(64)) {
            // Swiped up: hide until Recupero is opened again or "Show overlay" is tapped.
            dismissed = true
            handler.post { render() }
          } else if (!moved) {
            packageManager.getLaunchIntentForPackage(packageName)?.let {
              it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
              startActivity(it)
            }
          }
        }
      }
      return true
    }
  }

  private fun detach() {
    val view = container ?: return
    if (attached) {
      try {
        windowManager?.removeView(view)
      } catch (error: Exception) {
        Log.w(TAG, "remove overlay failed", error)
      }
      attached = false
    }
  }

  private fun buildNotification(): Notification {
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      manager.createNotificationChannel(
        NotificationChannel(CHANNEL_ID, "Timer overlay", NotificationManager.IMPORTANCE_MIN),
      )
    }
    val showIntent = android.app.PendingIntent.getService(
      this,
      1,
      Intent(this, TimerOverlayService::class.java).setAction(ACTION_SHOW),
      android.app.PendingIntent.FLAG_IMMUTABLE,
    )
    val launch = packageManager.getLaunchIntentForPackage(packageName)
    val pending = launch?.let {
      android.app.PendingIntent.getActivity(this, 0, it, android.app.PendingIntent.FLAG_IMMUTABLE)
    }
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(this, CHANNEL_ID)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(this)
    }
    val now = System.currentTimeMillis()
    val needs = notificationText(now)
    lastNotificationText = needs
    val title = "⏱ " + timers.joinToString(", ") { it.note ?: it.name }
    builder
      .setSmallIcon(applicationInfo.icon)
      .setContentTitle(title)
      .setContentText(if (needs.isEmpty()) "Timer running" else needs.lines().first())
      .setWhen(timers.first().start)
      .setUsesChronometer(true)
      .setOnlyAlertOnce(true)
      .setOngoing(true)
      .addAction(Notification.Action.Builder(null, "Show overlay", showIntent).build())
    if (needs.isNotEmpty()) builder.setStyle(Notification.BigTextStyle().bigText(needs))
    return builder
      .setContentIntent(pending)
      .build()
  }

  override fun onDestroy() {
    handler.removeCallbacks(tick)
    detach()
    container = null
    bubbles.clear()
    if (instance === this) instance = null
    super.onDestroy()
  }

  private fun dp(value: Int): Int =
    TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value.toFloat(), resources.displayMetrics).toInt()

  private fun format(ms: Long): String {
    val total = Math.max(0L, ms) / 1000
    val h = total / 3600
    val m = (total % 3600) / 60
    val s = total % 60
    return if (h > 0) String.format("%d:%02d:%02d", h, m, s) else String.format("%02d:%02d", m, s)
  }

  private fun parse(json: String): List<Timer> {
    val array = JSONArray(json)
    return (0 until array.length()).map {
      val item = array.getJSONObject(it)
      val need = item.optJSONObject("need")
      val fill = need?.let {
        Fill(it.getString("emoji"), it.getString("label"), it.getDouble("level"), it.getDouble("fullInMs"), it.getLong("at"))
      }
      val level = item.optJSONObject("level")?.let { Level(it.optDouble("inLevel", 0.0), it.optDouble("forLevel", 0.0)) }
      val icon = item.optString("icon", "").ifEmpty { null }
      val note = item.optString("note", "").ifEmpty { null }
      Timer(item.getString("name"), item.getLong("start"), fill, icon, level, note)
    }
  }

  companion object {
    private val GREEN = Color.parseColor("#4ADE80")
    const val EXTRA_TIMERS = "timers"
    const val EXTRA_VISIBLE = "visible"
    const val ACTION_SHOW = "expo.modules.appusage.SHOW_TIMER_OVERLAY"
    private const val CHANNEL_ID = "recupero-timer-overlay"
    private const val NOTIFICATION_ID = 7421
    private const val TAG = "TimerOverlay"
    @Volatile var instance: TimerOverlayService? = null
  }
}
