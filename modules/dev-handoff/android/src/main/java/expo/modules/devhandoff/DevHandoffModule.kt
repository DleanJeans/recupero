package expo.modules.devhandoff

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.content.FileProvider
import androidx.core.content.IntentCompat
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

private const val CONSUMED_EXTRA = "expo.modules.devhandoff.CONSUMED"
private const val INCOMING_FILE_NAME = "dev-handoff-incoming.json"

class DevHandoffModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  // An intent that arrived while the app was already running (onNewIntent).
  private var newIntent: Intent? = null

  override fun definition() = ModuleDefinition {
    Name("DevHandoff")

    Events("onIncomingFile")

    Function("getPackageName") {
      context.packageName
    }

    // Opens `fileUri` (a file:// URI inside the cache dir) in `targetPackage` with a read-only grant.
    // Resolves false when the target app is not installed or has no matching intent filter.
    AsyncFunction("sendFile") { fileUri: String, targetPackage: String, mimeType: String ->
      val path = Uri.parse(fileUri).path ?: throw IllegalArgumentException("Not a file URI: $fileUri")
      val contentUri = FileProvider.getUriForFile(context, "${context.packageName}.devhandoff", File(path))
      val intent = Intent(Intent.ACTION_VIEW)
        .setDataAndType(contentUri, mimeType)
        .setPackage(targetPackage)
        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
      try {
        (appContext.currentActivity ?: context).startActivity(intent)
        true
      } catch (_: ActivityNotFoundException) {
        false
      }
    }

    // Copies a file this app was opened with (VIEW or SEND intent) into the cache dir and returns
    // its file:// URI, or null. Each intent is handed out once, so a relaunch doesn't re-import.
    AsyncFunction("takePendingFile") {
      val intent = newIntent ?: appContext.currentActivity?.intent
      newIntent = null
      intent?.let { takeFile(it) }
    }

    OnNewIntent { intent ->
      if (incomingUri(intent) != null) {
        newIntent = intent
        sendEvent("onIncomingFile", mapOf<String, Any>())
      }
    }
  }

  private fun incomingUri(intent: Intent): Uri? {
    if (intent.getBooleanExtra(CONSUMED_EXTRA, false)) return null
    return when (intent.action) {
      Intent.ACTION_VIEW -> intent.data
      Intent.ACTION_SEND -> IntentCompat.getParcelableExtra(intent, Intent.EXTRA_STREAM, Uri::class.java)
      else -> null
    }?.takeIf { it.scheme == "content" || it.scheme == "file" }
  }

  private fun takeFile(intent: Intent): String? {
    val uri = incomingUri(intent) ?: return null
    intent.putExtra(CONSUMED_EXTRA, true)
    val target = File(context.cacheDir, INCOMING_FILE_NAME)
    val input = context.contentResolver.openInputStream(uri) ?: return null
    input.use { source -> target.outputStream().use { source.copyTo(it) } }
    return Uri.fromFile(target).toString()
  }
}
