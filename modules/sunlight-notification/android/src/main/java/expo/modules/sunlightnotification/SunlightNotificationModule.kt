package expo.modules.sunlightnotification

import android.content.Context
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SunlightNotificationModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("SunlightNotification")

    // JSON SunlightNotificationPlan from src/utils/sunlight-utils.ts. Returns false when Android refused to
    // start the service from the background (a plain ongoing notification is shown instead).
    Function("start") { json: String ->
      SunlightService.start(context, json)
    }

    // Lets JS tell builds that can show a pause from older ones (which would keep counting).
    Function("supportsPause") {
      true
    }

    Function("stop") {
      SunlightService.stop(context)
    }
  }
}
