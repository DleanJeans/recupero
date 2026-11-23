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
import android.graphics.drawable.Drawable
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
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import org.json.JSONArray
import org.json.JSONObject

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

  private class Timer(val name: String, val start: Long, val fill: Fill?, val icon: String?, val level: Level?, val note: String?, val tracksApp: Boolean, val appPackage: String? = null)

  /**
   * One timer's card. Row 1: the behavior's icon (the tracked app's launcher icon, else its emoji), name and time.
   * Row 2: the need it fills (emoji, name, a filling bar, %), or the behavior's level progress without a need.
   */
  private class Bubble(
    val root: LinearLayout,
    val top: LinearLayout,
    val iconImage: ImageView,
    val iconEmoji: TextView,
    val name: TextView,
    val time: TextView,
    val extra: LinearLayout,
    val extraEmoji: TextView,
    val extraLabel: TextView,
    val bar: BarView,
    val percent: TextView,
    /** Docked mode: just the app icon and the need's ring, in a slim column. */
    val tab: LinearLayout,
    val tabImage: ImageView,
    val tabEmoji: TextView,
    val tabRing: RingView,
  ) {
    var hasExtra = false
  }


  private val handler = Handler(Looper.getMainLooper())
  /** Timers Recupero hands over. */
  private var jsTimers: List<Timer> = emptyList()
  /** The app in front that helps a need (see NeedAppOverlay); drawn as one more timer unless a Recupero timer already watches it. */
  private var appTimer: Timer? = null
  private val timers: List<Timer>
    get() {
      val auto = appTimer
      return if (auto != null && jsTimers.none { it.appPackage == auto.appPackage }) jsTimers + auto else jsTimers
    }
  private var windowManager: WindowManager? = null
  private var container: LinearLayout? = null
  private val bubbles = mutableListOf<Bubble>()
  private var params: WindowManager.LayoutParams? = null
  private var wantVisible = false
  private var attached = false
  private var dismissed = false

  /** The user's choice from the notification button; null = default (shown only while a timer tracks another app). */
  private var userShown: Boolean? = null
  private var lastNotificationText = ""
  private var posX = 0
  private var posY = 0
  /** Still at the default spot, centred at the top (posX is only used once the user moved it). */
  private var centered = true
  /** -1 docked to the left edge, 1 to the right edge, 0 free. A docked timer shows as a slim tab. */
  private var docked = 0
  /** A docked tab tapped open as the full card for a few seconds. */
  private var peek = false
  private val unpeek = Runnable {
    peek = false
    applyModes()
  }

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
    // Where the user left it (position, docked side) survives restarts; the default is top centre.
    val saved = getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    centered = saved.getBoolean("centered", true)
    docked = saved.getInt("docked", 0)
    posX = saved.getInt("posX", 0)
    posY = saved.getInt("posY", dp(48))
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_TOGGLE) {
      val shown = !(overlayShown() && !dismissed)
      userShown = shown
      dismissed = false
      // The button is only reachable while Recupero is in the background.
      if (shown) wantVisible = true
      handler.post {
        render()
        refreshNotification()
      }
      return START_NOT_STICKY
    }
    if (intent?.action == ACTION_APP_LEAVE) {
      appTimer = null
      handler.post { if (timers.isEmpty()) stopSelf() else render() }
      return START_NOT_STICKY
    }
    if (intent?.action == ACTION_APP_ENTER) {
      appTimer = parseAppTimer(intent) ?: appTimer
      // A new app in front gets the overlay again even if the last one was swiped away.
      dismissed = false
      wantVisible = true
      if (!enterForeground()) return START_NOT_STICKY
      handler.removeCallbacks(tick)
      handler.post(tick)
      return START_NOT_STICKY
    }
    val json = intent?.getStringExtra(EXTRA_TIMERS)
    if (json == null) {
      if (appTimer == null) stopSelf()
      return START_NOT_STICKY
    }
    jsTimers = parse(json)
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
    if (!enterForeground()) return START_NOT_STICKY
    handler.removeCallbacks(tick)
    handler.post(tick)
    return START_NOT_STICKY
  }

  /** Goes foreground with the notification. Stops the service (false) when Android refuses. */
  private fun enterForeground(): Boolean {
    try {
      val notification = buildNotification()
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
      } else {
        startForeground(NOTIFICATION_ID, notification)
      }
      return true
    } catch (error: Exception) {
      Log.w(TAG, "startForeground refused", error)
      stopSelf()
      return false
    }
  }

  /** Drops the Recupero timers (they all ended); stays up while an app's automatic overlay is showing. */
  fun clearTimers() {
    handler.post {
      jsTimers = emptyList()
      if (appTimer == null) stopSelf() else render()
    }
  }

  /** The need the app in front fills, from its level at `at` minus decay since, then rising while it is used. */
  private fun parseAppTimer(intent: Intent): Timer? {
    val packageName = intent.getStringExtra(EXTRA_APP_PACKAGE) ?: return null
    val json = intent.getStringExtra(EXTRA_APP_JSON) ?: return null
    return try {
      val item = JSONObject(json)
      val start = intent.getLongExtra(EXTRA_APP_START, System.currentTimeMillis())
      val need = item.optJSONObject("need")
      val fullMinutes = need?.optDouble("fullMinutes", 0.0) ?: 0.0
      val fill = if (need != null && fullMinutes > 0) {
        val decayed = need.getDouble("level") - need.optDouble("decayPerHour", 0.0) * Math.max(0L, start - need.getLong("at")) / 3600000.0
        val level = decayed.coerceIn(0.0, 100.0)
        Fill(need.getString("emoji"), need.getString("label"), level, (100.0 - level) / (100.0 / fullMinutes) * 60000.0, start)
      } else {
        null
      }
      val icon = item.optString("icon", "").ifEmpty { null } ?: need?.optString("emoji", "")?.ifEmpty { null }
      Timer(item.getString("name"), start, fill, icon, null, null, true, packageName)
    } catch (error: Exception) {
      Log.w(TAG, "Bad app overlay", error)
      null
    }
  }

  fun setVisible(visible: Boolean) {
    if (!visible) dismissed = false
    wantVisible = visible
    handler.post { render() }
  }

  private fun overlayShown(): Boolean = userShown ?: timers.any { it.tracksApp }

  private fun refreshNotification() {
    if (timers.isEmpty()) return
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.notify(NOTIFICATION_ID, buildNotification())
  }

  private fun render() {
    val show = wantVisible && !dismissed && overlayShown() && timers.isNotEmpty() && Settings.canDrawOverlays(this)
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
      // The app being used (e.g. Shopee for a Shopping task) beats the emoji.
      val image = timer.appPackage?.let { appIcon(it) }
      val tabImage = timer.appPackage?.let { appIcon(it, "tab") }
      bubble.tabImage.setImageDrawable(tabImage)
      bubble.tabImage.visibility = if (tabImage != null) View.VISIBLE else View.GONE
      bubble.tabEmoji.text = timer.icon ?: timer.fill?.emoji ?: "⏱"
      bubble.tabEmoji.visibility = if (tabImage != null) View.GONE else View.VISIBLE
      bubble.iconImage.setImageDrawable(image)
      bubble.iconImage.visibility = if (image != null) View.VISIBLE else View.GONE
      bubble.iconEmoji.text = timer.icon ?: timer.fill?.emoji ?: "⏱"
      bubble.iconEmoji.visibility = if (image != null) View.GONE else View.VISIBLE
      val share = ringShare(timer, now, elapsed)
      val color = if (timer.fill != null) GREEN else YELLOW
      bubble.hasExtra = timer.fill != null || timer.level != null
      if (bubble.hasExtra) {
        bubble.tabRing.share = share
        bubble.tabRing.color = color
        bubble.tabRing.emoji = timer.fill?.emoji ?: "⭐"
        bubble.tabRing.invalidate()
        bubble.extraEmoji.text = timer.fill?.emoji ?: "⭐"
        bubble.extraLabel.text = timer.fill?.label ?: "Level"
        bubble.bar.share = share
        bubble.bar.color = color
        bubble.bar.invalidate()
        bubble.percent.text = "${Math.round(share * 100)}%"
        bubble.percent.setTextColor(color)
      }
      bubble.time.text = format(elapsed)
      // The item being worked on (a Shopping task) beats the behavior's name.
      bubble.name.text = timer.note ?: timer.name
    }
    applyModes()
    for (bubble in bubbles) fitBar(bubble)
    refreshNotification(now)
    if (!attached) {
      val layout = WindowManager.LayoutParams(
        WindowManager.LayoutParams.WRAP_CONTENT,
        WindowManager.LayoutParams.WRAP_CONTENT,
        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
        PixelFormat.TRANSLUCENT,
      )
      applyPlacement(layout)
      params = layout
      try {
        windowManager?.addView(view, layout)
        attached = true
      } catch (error: Exception) {
        Log.w(TAG, "overlay refused", error)
      }
    }
  }

  /** Docked (and not peeking): only the slim tab shows. Otherwise the full card, rounded on the docked side only. */
  private fun applyModes() {
    val tabMode = docked != 0 && !peek
    for (bubble in bubbles) {
      bubble.top.visibility = if (tabMode) View.GONE else View.VISIBLE
      bubble.extra.visibility = if (!tabMode && bubble.hasExtra) View.VISIBLE else View.GONE
      bubble.tab.visibility = if (tabMode) View.VISIBLE else View.GONE
      bubble.tabRing.visibility = if (bubble.hasExtra) View.VISIBLE else View.GONE
      if (tabMode) bubble.root.setPadding(dp(5), dp(8), dp(5), dp(8)) else bubble.root.setPadding(dp(12), dp(8), dp(12), dp(9))
      val background = GradientDrawable()
      background.setColor(Color.parseColor("#EE151515"))
      background.setStroke(dp(2), GREEN)
      val big = dp(18).toFloat()
      background.cornerRadii = when (docked) {
        // top-left, top-right, bottom-right, bottom-left (x, y each)
        -1 -> floatArrayOf(0f, 0f, big, big, big, big, 0f, 0f)
        1 -> floatArrayOf(big, big, 0f, 0f, 0f, 0f, big, big)
        else -> floatArrayOf(big, big, big, big, big, big, big, big)
      }
      bubble.root.background = background
    }
  }

  /** Puts the window where the saved state says: docked to an edge, centred at the top, or at posX. */
  private fun applyPlacement(layout: WindowManager.LayoutParams) {
    when {
      docked < 0 -> { layout.gravity = Gravity.TOP or Gravity.START; layout.x = 0 }
      docked > 0 -> { layout.gravity = Gravity.TOP or Gravity.END; layout.x = 0 }
      centered -> { layout.gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL; layout.x = 0 }
      else -> { layout.gravity = Gravity.TOP or Gravity.START; layout.x = posX }
    }
    layout.y = posY
  }

  /** The card is as wide as row 1 (name + gap + time). Row 2's bar takes whatever its icon, name and % leave. */
  private fun fitBar(bubble: Bubble) {
    if (bubble.extra.visibility != View.VISIBLE) return
    val unspecified = View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED)
    bubble.top.measure(unspecified, unspecified)
    bubble.extraEmoji.measure(unspecified, unspecified)
    bubble.extraLabel.measure(unspecified, unspecified)
    bubble.percent.measure(unspecified, unspecified)
    val params = bubble.bar.layoutParams as LinearLayout.LayoutParams
    val used = bubble.extraEmoji.measuredWidth + bubble.extraLabel.measuredWidth + bubble.percent.measuredWidth +
      (bubble.extraLabel.layoutParams as LinearLayout.LayoutParams).leftMargin + params.leftMargin + params.rightMargin
    val width = Math.max(dp(36), bubble.top.measuredWidth - used)
    if (params.width != width) {
      params.width = width
      bubble.bar.layoutParams = params
    }
  }

  private val appIcons = HashMap<String, Drawable?>()

  /** The launcher icon of an installed app, cached; null if it can't be found. */
  private fun appIcon(packageName: String, slot: String = ""): Drawable? =
    appIcons.getOrPut("$packageName#$slot") {
      try {
        packageManager.getApplicationIcon(packageName).constantState?.newDrawable()?.mutate()
      } catch (error: Exception) {
        null
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
    root.orientation = LinearLayout.VERTICAL
    root.setPadding(dp(12), dp(8), dp(12), dp(9))
    val background = GradientDrawable()
    background.setColor(Color.parseColor("#EE151515"))
    background.cornerRadius = dp(18).toFloat()
    background.setStroke(dp(2), GREEN)
    root.background = background
    root.layoutParams = LinearLayout.LayoutParams(
      LinearLayout.LayoutParams.WRAP_CONTENT,
      LinearLayout.LayoutParams.WRAP_CONTENT,
    )

    // Row 1: icon, name (shrinks, ends in an ellipsis), time (never shrinks or wraps).
    val top = LinearLayout(this)
    top.orientation = LinearLayout.HORIZONTAL
    top.gravity = Gravity.CENTER_VERTICAL
    root.addView(top)

    val iconBox = FrameLayout(this)
    top.addView(iconBox, LinearLayout.LayoutParams(dp(24), dp(24)))
    val iconImage = ImageView(this)
    iconImage.scaleType = ImageView.ScaleType.FIT_CENTER
    iconBox.addView(iconImage, FrameLayout.LayoutParams(dp(24), dp(24)))
    val iconEmoji = TextView(this)
    iconEmoji.gravity = Gravity.CENTER
    iconEmoji.setTextSize(TypedValue.COMPLEX_UNIT_SP, 17f)
    iconEmoji.setSingleLine(true)
    iconBox.addView(iconEmoji, FrameLayout.LayoutParams(dp(24), dp(24)))

    val name = TextView(this)
    name.setTextColor(Color.parseColor("#E8F5EC"))
    name.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
    name.setSingleLine(true)
    name.ellipsize = android.text.TextUtils.TruncateAt.END
    name.maxWidth = dp(190)
    val nameParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT)
    nameParams.leftMargin = dp(8)
    top.addView(name, nameParams)

    val time = TextView(this)
    time.setTextColor(GREEN)
    time.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
    time.typeface = android.graphics.Typeface.DEFAULT_BOLD
    time.fontFeatureSettings = "tnum"
    time.setSingleLine(true)
    val timeParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT)
    timeParams.leftMargin = dp(14)
    top.addView(time, timeParams)

    // Row 2: need icon, need name, filling bar, %.
    val extra = LinearLayout(this)
    extra.orientation = LinearLayout.HORIZONTAL
    extra.gravity = Gravity.CENTER_VERTICAL
    val extraParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
    extraParams.topMargin = dp(6)
    root.addView(extra, extraParams)

    val extraEmoji = TextView(this)
    extraEmoji.gravity = Gravity.CENTER
    extraEmoji.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
    extraEmoji.setSingleLine(true)
    extra.addView(extraEmoji, LinearLayout.LayoutParams(dp(24), LinearLayout.LayoutParams.WRAP_CONTENT))

    val extraLabel = TextView(this)
    extraLabel.setTextColor(Color.parseColor("#CFE9D7"))
    extraLabel.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
    extraLabel.setSingleLine(true)
    extraLabel.ellipsize = android.text.TextUtils.TruncateAt.END
    extraLabel.maxWidth = dp(90)
    val labelParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT)
    labelParams.leftMargin = dp(8)
    extra.addView(extraLabel, labelParams)

    val bar = BarView(this)
    val barParams = LinearLayout.LayoutParams(dp(60), dp(7))
    barParams.leftMargin = dp(7)
    barParams.rightMargin = dp(7)
    extra.addView(bar, barParams)

    val percent = TextView(this)
    percent.setTextColor(GREEN)
    percent.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
    percent.typeface = android.graphics.Typeface.DEFAULT_BOLD
    percent.fontFeatureSettings = "tnum"
    percent.setSingleLine(true)
    percent.minWidth = dp(32)
    percent.gravity = Gravity.END
    extra.addView(percent, LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT))

    // Docked tab: app icon over the need ring.
    val tab = LinearLayout(this)
    tab.orientation = LinearLayout.VERTICAL
    tab.gravity = Gravity.CENTER_HORIZONTAL
    tab.visibility = View.GONE
    root.addView(tab, LinearLayout.LayoutParams(dp(36), LinearLayout.LayoutParams.WRAP_CONTENT))
    val tabBox = FrameLayout(this)
    tab.addView(tabBox, LinearLayout.LayoutParams(dp(28), dp(28)))
    val tabImage = ImageView(this)
    tabImage.scaleType = ImageView.ScaleType.FIT_CENTER
    tabBox.addView(tabImage, FrameLayout.LayoutParams(dp(28), dp(28)))
    val tabEmoji = TextView(this)
    tabEmoji.gravity = Gravity.CENTER
    tabEmoji.setTextSize(TypedValue.COMPLEX_UNIT_SP, 20f)
    tabEmoji.setSingleLine(true)
    tabBox.addView(tabEmoji, FrameLayout.LayoutParams(dp(28), dp(28)))
    val tabRing = RingView(this)
    val ringParams = LinearLayout.LayoutParams(dp(30), dp(30))
    ringParams.topMargin = dp(6)
    tab.addView(tabRing, ringParams)

    return Bubble(root, top, iconImage, iconEmoji, name, time, extra, extraEmoji, extraLabel, bar, percent, tab, tabImage, tabEmoji, tabRing)
  }

  /** A progress ring (clockwise from the top) around an emoji; used by the docked tab. */
  private class RingView(context: Context) : View(context) {
    var share = 0f
    var color = GREEN
    var emoji = ""
    private val density = context.resources.displayMetrics.density
    private val stroke = 3f * density
    private val track = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      style = Paint.Style.STROKE
      strokeWidth = stroke
      this.color = Color.parseColor("#33FFFFFF")
    }
    private val arc = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      style = Paint.Style.STROKE
      strokeWidth = stroke
      strokeCap = Paint.Cap.ROUND
    }
    private val text = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      textAlign = Paint.Align.CENTER
      textSize = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP, 13f, context.resources.displayMetrics)
    }
    private val bounds = RectF()

    override fun onDraw(canvas: Canvas) {
      super.onDraw(canvas)
      val inset = stroke / 2 + density
      bounds.set(inset, inset, width - inset, height - inset)
      canvas.drawOval(bounds, track)
      val sweep = 360f * share.coerceIn(0f, 1f)
      if (sweep > 0f) {
        arc.color = color
        canvas.drawArc(bounds, -90f, sweep, false, arc)
      }
      val baseline = height / 2f - (text.descent() + text.ascent()) / 2f
      canvas.drawText(emoji, width / 2f, baseline, text)
    }
  }

  /** A rounded progress bar filling left to right. */
  private class BarView(context: Context) : View(context) {
    var share = 0f
    var color = GREEN
    private val track = Paint(Paint.ANTI_ALIAS_FLAG).apply { this.color = Color.parseColor("#1FFFFFFF") }
    private val fill = Paint(Paint.ANTI_ALIAS_FLAG)
    private val rect = RectF()

    override fun onDraw(canvas: Canvas) {
      super.onDraw(canvas)
      val radius = height / 2f
      rect.set(0f, 0f, width.toFloat(), height.toFloat())
      canvas.drawRoundRect(rect, radius, radius, track)
      val filled = width * share.coerceIn(0f, 1f)
      if (filled > 0f) {
        fill.color = color
        rect.set(0f, 0f, Math.max(filled, height.toFloat()), height.toFloat())
        canvas.drawRoundRect(rect, radius, radius, fill)
      }
    }
  }

  private inner class DragListener : View.OnTouchListener {
    private var downX = 0f
    private var downY = 0f
    private var startX = 0
    private var startY = 0
    private var moved = false
    private var wasDocked = 0
    private var wasCentered = true
    private var wasX = 0
    private var wasY = 0
    private val location = IntArray(2)

    override fun onTouch(view: View, event: MotionEvent): Boolean {
      val layout = params ?: return false
      when (event.action) {
        MotionEvent.ACTION_DOWN -> {
          downX = event.rawX
          downY = event.rawY
          moved = false
          wasDocked = docked
          wasCentered = centered
          wasX = posX
          wasY = posY
          // Drag in plain screen coordinates whatever the window was anchored to.
          view.getLocationOnScreen(location)
          layout.gravity = Gravity.TOP or Gravity.START
          layout.x = location[0]
          startX = layout.x
          startY = layout.y
        }
        MotionEvent.ACTION_MOVE -> {
          val dx = (event.rawX - downX).toInt()
          val dy = (event.rawY - downY).toInt()
          if (Math.abs(dx) > dp(6) || Math.abs(dy) > dp(6)) moved = true
          if (moved) {
            showCloseTarget()
            var x = startX + dx
            var y = startY + dy
            val over = overCloseTarget(x, y, view.width, view.height)
            setCloseTargetActive(over)
            if (over) {
              // Snap above the Dismiss pill, a bit smaller, like a Messenger bubble.
              x = (screenWidth() - view.width) / 2
              y = closeCenterY() - dp(64) - view.height / 2
            }
            view.scaleX = if (over) 0.62f else 1f
            view.scaleY = if (over) 0.62f else 1f
            layout.x = x
            layout.y = y
            windowManager?.updateViewLayout(view, layout)
          }
        }
        MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
          val dropped = moved && overCloseTarget(layout.x, layout.y, view.width, view.height)
          hideCloseTarget()
          view.scaleX = 1f
          view.scaleY = 1f
          if (dropped) {
            // Dropped on Dismiss: hide until Recupero is opened again or "Show overlay" is tapped. It comes back where it was.
            docked = wasDocked
            centered = wasCentered
            posX = wasX
            posY = wasY
            applyPlacement(layout)
            dismissed = true
            handler.post {
              render()
              refreshNotification()
            }
          } else if (moved) {
            settle(view, layout)
          } else {
            applyPlacement(layout)
            windowManager?.updateViewLayout(view, layout)
            if (event.action == MotionEvent.ACTION_UP) onTap(view, layout)
          }
        }
      }
      return true
    }
  }

  /** After a drag: dock to an edge when released within 48 dp of it, otherwise stay free where it was dropped. */
  private fun settle(view: View, layout: WindowManager.LayoutParams) {
    val width = screenWidth()
    val w = view.width
    handler.removeCallbacks(unpeek)
    peek = false
    posY = layout.y.coerceIn(0, Math.max(0, screenHeight() - view.height))
    when {
      layout.x <= dp(48) -> docked = -1
      layout.x + w >= width - dp(48) -> docked = 1
      else -> {
        docked = 0
        centered = false
        posX = layout.x.coerceIn(0, Math.max(0, width - w))
      }
    }
    applyPlacement(layout)
    applyModes()
    windowManager?.updateViewLayout(view, layout)
    getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
      .putBoolean("centered", centered).putInt("docked", docked).putInt("posX", posX).putInt("posY", posY)
      .apply()
    if (docked == 0) {
      // The card is wider than the tab was: keep it on screen once it has been laid out.
      view.post {
        val fixed = layout.x.coerceIn(0, Math.max(0, screenWidth() - view.width))
        if (fixed != layout.x) {
          layout.x = fixed
          posX = fixed
          windowManager?.updateViewLayout(view, layout)
        }
      }
    }
  }

  /** Tap on a docked tab peeks the full card for 4 s; tap on the card (or when free) opens Recupero. */
  private fun onTap(view: View, layout: WindowManager.LayoutParams) {
    if (docked != 0 && !peek) {
      peek = true
      handler.removeCallbacks(unpeek)
      handler.postDelayed(unpeek, 4000)
      applyModes()
      return
    }
    handler.removeCallbacks(unpeek)
    peek = false
    applyModes()
    packageManager.getLaunchIntentForPackage(packageName)?.let {
      it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      startActivity(it)
    }
  }

  private var closeView: TextView? = null
  private var closeShown = false

  private fun screenWidth(): Int = resources.displayMetrics.widthPixels
  private fun screenHeight(): Int = resources.displayMetrics.heightPixels
  /** The Dismiss pill sits at the bottom centre; this is its centre line. */
  private fun closeCenterY(): Int = screenHeight() - dp(84) - dp(24)

  /** True when the dragged card's centre is within reach of the Dismiss pill. */
  private fun overCloseTarget(x: Int, y: Int, width: Int, height: Int): Boolean {
    val dx = (x + width / 2 - screenWidth() / 2).toDouble()
    val dy = (y + height / 2 - closeCenterY()).toDouble()
    return Math.hypot(dx, dy) < dp(110)
  }

  private fun showCloseTarget() {
    if (closeShown) return
    val view = closeView ?: TextView(this).also {
      it.text = "✕  Dismiss"
      it.gravity = Gravity.CENTER
      it.setTextColor(Color.WHITE)
      it.setTextSize(TypedValue.COMPLEX_UNIT_SP, 18f)
      it.setSingleLine(true)
      it.setPadding(dp(24), dp(12), dp(24), dp(12))
      closeView = it
    }
    setCloseTargetActive(false)
    val layout = WindowManager.LayoutParams(
      WindowManager.LayoutParams.WRAP_CONTENT,
      WindowManager.LayoutParams.WRAP_CONTENT,
      WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
        WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or
        WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
      PixelFormat.TRANSLUCENT,
    )
    layout.gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
    layout.y = dp(84) - dp(24)
    try {
      windowManager?.addView(view, layout)
      closeShown = true
    } catch (error: Exception) {
      Log.w(TAG, "dismiss target refused", error)
    }
  }

  private fun setCloseTargetActive(active: Boolean) {
    val view = closeView ?: return
    val background = GradientDrawable()
    background.cornerRadius = dp(30).toFloat()
    background.setColor(if (active) Color.parseColor("#F0E0335A") else Color.parseColor("#E6444444"))
    view.background = background
    view.scaleX = if (active) 1.12f else 1f
    view.scaleY = if (active) 1.12f else 1f
  }

  private fun hideCloseTarget() {
    val view = closeView
    if (view != null && closeShown) {
      try {
        windowManager?.removeView(view)
      } catch (error: Exception) {
        Log.w(TAG, "remove dismiss target failed", error)
      }
    }
    closeShown = false
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
      Intent(this, TimerOverlayService::class.java).setAction(ACTION_TOGGLE),
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
      .addAction(Notification.Action.Builder(null, if (overlayShown() && !dismissed) "Hide overlay" else "Show overlay", showIntent).build())
    if (needs.isNotEmpty()) builder.setStyle(Notification.BigTextStyle().bigText(needs))
    return builder
      .setContentIntent(pending)
      .build()
  }

  override fun onDestroy() {
    handler.removeCallbacks(tick)
    handler.removeCallbacks(unpeek)
    hideCloseTarget()
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
      Timer(item.getString("name"), item.getLong("start"), fill, icon, level, note, item.optBoolean("tracksApp", false), item.optString("appPackage", "").ifEmpty { null })
    }
  }

  companion object {
    private val GREEN = Color.parseColor("#4ADE80")
    private val YELLOW = Color.parseColor("#FACC15")
    const val EXTRA_TIMERS = "timers"
    const val EXTRA_VISIBLE = "visible"
    const val ACTION_APP_ENTER = "expo.modules.appusage.APP_OVERLAY_ENTER"
    const val ACTION_APP_LEAVE = "expo.modules.appusage.APP_OVERLAY_LEAVE"
    const val EXTRA_APP_PACKAGE = "app_package"
    const val EXTRA_APP_JSON = "app_json"
    const val EXTRA_APP_START = "app_start"
    const val ACTION_TOGGLE = "expo.modules.appusage.TOGGLE_TIMER_OVERLAY"
    private const val CHANNEL_ID = "recupero-timer-overlay"
    private const val NOTIFICATION_ID = 7421
    private const val TAG = "TimerOverlay"
    private const val PREFS = "timer-overlay"
    @Volatile var instance: TimerOverlayService? = null
  }
}
