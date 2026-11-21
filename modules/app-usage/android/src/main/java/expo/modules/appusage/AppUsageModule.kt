package expo.modules.appusage

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Process
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Raw UsageEvents.Event type values, so older API levels don't need the named constants.
private const val ACTIVITY_RESUMED = 1
private const val ACTIVITY_PAUSED = 2
private const val SCREEN_NON_INTERACTIVE = 16
private const val KEYGUARD_SHOWN = 17
private const val ACTIVITY_STOPPED = 23
private const val DEVICE_SHUTDOWN = 26

class AppUsageModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("AppUsage")

    Function("hasPermission") {
      hasUsageAccess()
    }

    Function("openPermissionSettings") {
      val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    // Returns foreground transitions between start and end (epoch ms) as
    // { packageName, type: 'resume' | 'pause' | 'screen_off', timestamp }.
    AsyncFunction("queryEvents") { start: Double, end: Double ->
      if (!hasUsageAccess()) return@AsyncFunction emptyList<Map<String, Any>>()
      val manager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
      val events = manager.queryEvents(start.toLong(), end.toLong())
      val event = UsageEvents.Event()
      val result = mutableListOf<Map<String, Any>>()
      while (events.hasNextEvent()) {
        events.getNextEvent(event)
        val type = when (event.eventType) {
          ACTIVITY_RESUMED -> "resume"
          ACTIVITY_PAUSED, ACTIVITY_STOPPED -> "pause"
          SCREEN_NON_INTERACTIVE, KEYGUARD_SHOWN, DEVICE_SHUTDOWN -> "screen_off"
          else -> null
        } ?: continue
        result.add(
          mapOf(
            "packageName" to (event.packageName ?: ""),
            "type" to type,
            "timestamp" to event.timeStamp.toDouble(),
          ),
        )
      }
      result
    }

    // JSON array of { cueId, packageName, title, body, data, categoryIdentifier, channelId } (AppOpenWatch in JS).
    Function("setAppOpenWatches") { json: String ->
      AppOpenWatcher.setWatches(context, json)
      SiteTrackingService.refreshPackageFilter()
    }

    // JSON array of { packageName, name, icon, need } (NeedAppOverlayWatch in JS): apps that show the timer overlay when opened.
    Function("setNeedAppOverlayWatches") { json: String ->
      NeedAppOverlay.setWatches(context, json)
      SiteTrackingService.refreshPackageFilter()
    }

    Function("isSiteTrackingEnabled") {
      SiteTrackingService.isEnabled(context)
    }

    Function("openAccessibilitySettings") {
      val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    // Site changes seen in Firefox's address bar between start and end (epoch ms) as { timestamp, host }.
    AsyncFunction("getSiteMarks") { start: Double, end: Double ->
      SiteMarks.read(context, start.toLong(), end.toLong())
    }

    // JSON of the last address bar read (or the toolbar's text nodes when none was found); "" if never.
    Function("getSiteDebug") {
      SiteDebug.read(context)
    }

    Function("isMediaWatchEnabled") {
      MediaWatchService.isEnabled(context)
    }

    Function("openNotificationListenerSettings") {
      val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    // Play/pause changes of media apps between start and end (epoch ms) as { timestamp, packageName, playing }.
    AsyncFunction("getMediaEvents") { start: Double, end: Double ->
      MediaEvents.read(context, start.toLong(), end.toLong())
    }

    // Senders of WhatsApp and Messenger notifications between start and end (epoch ms) as { timestamp, packageName, title }.
    AsyncFunction("getChatEvents") { start: Double, end: Double ->
      ChatEvents.read(context, start.toLong(), end.toLong())
    }

    Function("canDrawOverlays") {
      Settings.canDrawOverlays(context)
    }

    Function("openOverlaySettings") {
      val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, android.net.Uri.parse("package:${context.packageName}"))
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    // Opens another app by package name. Returns false when it is not installed or has no launcher activity.
    Function("launchApp") { packageName: String ->
      val intent = context.packageManager.getLaunchIntentForPackage(packageName)
      if (intent == null) {
        false
      } else {
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        true
      }
    }

    // Starts or updates the floating timer pill. timersJson is [{ name, start }] for the running timers.
    Function("startTimerOverlay") { timersJson: String, visible: Boolean ->
      val intent = Intent(context, TimerOverlayService::class.java)
        .putExtra(TimerOverlayService.EXTRA_TIMERS, timersJson)
        .putExtra(TimerOverlayService.EXTRA_VISIBLE, visible)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent) else context.startService(intent)
    }

    Function("setTimerOverlayVisible") { visible: Boolean ->
      TimerOverlayService.instance?.setVisible(visible)
    }

    Function("stopTimerOverlay") {
      // An automatic overlay for the app in front keeps the service alive; it clears only the JS timers.
      val running = TimerOverlayService.instance
      if (running != null) running.clearTimers() else context.stopService(Intent(context, TimerOverlayService::class.java))
    }

    // Saves the app's launcher icon as a PNG in the app's files and returns its file:// uri, or null.
    AsyncFunction("getAppIcon") { packageName: String ->
      try {
        val file = java.io.File(context.filesDir, "app-icons/$packageName.png")
        if (!file.exists()) {
          file.parentFile?.mkdirs()
          val drawable = context.packageManager.getApplicationIcon(packageName)
          val size = 192
          val bitmap = android.graphics.Bitmap.createBitmap(size, size, android.graphics.Bitmap.Config.ARGB_8888)
          val canvas = android.graphics.Canvas(bitmap)
          drawable.setBounds(0, 0, size, size)
          drawable.draw(canvas)
          file.outputStream().use { bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, it) }
        }
        "file://" + file.absolutePath
      } catch (e: Exception) {
        null
      }
    }

    AsyncFunction("getLaunchableApps") {
      val pm = context.packageManager
      val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
      val activities = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        pm.queryIntentActivities(intent, PackageManager.ResolveInfoFlags.of(0))
      } else {
        @Suppress("DEPRECATION")
        pm.queryIntentActivities(intent, 0)
      }
      activities
        .map { it.activityInfo.packageName to it.loadLabel(pm).toString() }
        .filter { (packageName, _) -> packageName != context.packageName }
        .distinctBy { it.first }
        .sortedBy { it.second.lowercase() }
        .map { (packageName, label) -> mapOf("packageName" to packageName, "label" to label) }
    }
  }

  private fun hasUsageAccess(): Boolean {
    val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      appOps.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
    } else {
      @Suppress("DEPRECATION")
      appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
    }
    if (mode == AppOpsManager.MODE_DEFAULT) {
      return context.checkCallingOrSelfPermission(android.Manifest.permission.PACKAGE_USAGE_STATS) ==
        PackageManager.PERMISSION_GRANTED
    }
    return mode == AppOpsManager.MODE_ALLOWED
  }
}
