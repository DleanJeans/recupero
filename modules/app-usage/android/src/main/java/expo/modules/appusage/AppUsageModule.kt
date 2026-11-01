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
