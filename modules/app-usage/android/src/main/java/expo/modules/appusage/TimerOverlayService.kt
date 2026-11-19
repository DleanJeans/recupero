package expo.modules.appusage

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Color
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
  private class Timer(val name: String, val start: Long)

  private val handler = Handler(Looper.getMainLooper())
  private var timers: List<Timer> = emptyList()
  private var windowManager: WindowManager? = null
  private var container: LinearLayout? = null
  private var params: WindowManager.LayoutParams? = null
  private var wantVisible = false
  private var attached = false
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
    val json = intent?.getStringExtra(EXTRA_TIMERS)
    if (json == null) {
      stopSelf()
      return START_NOT_STICKY
    }
    timers = parse(json)
    if (intent.hasExtra(EXTRA_VISIBLE)) wantVisible = intent.getBooleanExtra(EXTRA_VISIBLE, false)
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
    wantVisible = visible
    handler.post { render() }
  }

  private fun render() {
    val show = wantVisible && timers.isNotEmpty() && Settings.canDrawOverlays(this)
    if (!show) {
      detach()
      return
    }
    val view = container ?: buildView().also { container = it }
    if (view.childCount != timers.size) {
      view.removeAllViews()
      for (timer in timers) view.addView(label(timer))
    }
    val now = System.currentTimeMillis()
    for (index in timers.indices) {
      val label = view.getChildAt(index) as? TextView ?: continue
      label.text = "⏱ ${timers[index].name}  ${format(now - timers[index].start)}"
    }
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

  private fun buildView(): LinearLayout {
    val view = LinearLayout(this)
    view.orientation = LinearLayout.VERTICAL
    view.setPadding(dp(12), dp(8), dp(12), dp(8))
    val background = GradientDrawable()
    background.setColor(Color.parseColor("#E61E1E1E"))
    background.cornerRadius = dp(20).toFloat()
    background.setStroke(dp(1), Color.parseColor("#4ADE80"))
    view.background = background
    for (timer in timers) view.addView(label(timer))
    view.setOnTouchListener(DragListener())
    return view
  }

  private fun label(timer: Timer): TextView {
    val text = TextView(this)
    text.setTextColor(Color.parseColor("#4ADE80"))
    text.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
    text.setSingleLine(true)
    text.maxWidth = dp(260)
    text.ellipsize = android.text.TextUtils.TruncateAt.END
    text.text = "⏱ ${timer.name}"
    return text
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
          if (!moved) {
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
    return builder
      .setSmallIcon(applicationInfo.icon)
      .setContentTitle("Timer running")
      .setContentText(timers.joinToString(", ") { it.name })
      .setOngoing(true)
      .setContentIntent(pending)
      .build()
  }

  override fun onDestroy() {
    handler.removeCallbacks(tick)
    detach()
    container = null
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
      Timer(item.getString("name"), item.getLong("start"))
    }
  }

  companion object {
    const val EXTRA_TIMERS = "timers"
    const val EXTRA_VISIBLE = "visible"
    private const val CHANNEL_ID = "recupero-timer-overlay"
    private const val NOTIFICATION_ID = 7421
    private const val TAG = "TimerOverlay"
    @Volatile var instance: TimerOverlayService? = null
  }
}
