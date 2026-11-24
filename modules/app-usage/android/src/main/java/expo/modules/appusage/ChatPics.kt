package expo.modules.appusage

import android.app.Notification
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.graphics.drawable.Icon
import android.os.Bundle
import android.service.notification.StatusBarNotification
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.security.MessageDigest

/**
 * Keeps the sender's profile picture from WhatsApp, Messenger and Instagram notifications, on this phone
 * only (app private storage), one per sender and app. Group chats are skipped. Never stores message text.
 */
object ChatPics {
  val PACKAGES = setOf(
    "com.whatsapp", "com.whatsapp.w4b", "com.facebook.orca", "com.facebook.mlite", "com.instagram.android",
  )
  private const val PREFS = "recupero_chat_pics"
  private const val KEY = "pics"
  private const val DIR = "chat-pics"
  private const val PERSON_DIR = "person-pics"
  private const val SIZE = 256
  private const val MAX_PICS = 300

  fun onNotification(context: Context, sbn: StatusBarNotification) {
    val notification = sbn.notification
    if (notification.flags and Notification.FLAG_GROUP_SUMMARY != 0) return
    val extras = notification.extras ?: return
    if (extras.getBoolean(Notification.EXTRA_IS_GROUP_CONVERSATION, false)) return
    val name = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim() ?: return
    if (name.isBlank() || name == "WhatsApp" || name == "Messenger" || name == "Instagram" || name.endsWith("new messages")) return
    val bitmap = findAvatar(context, notification, extras) ?: return
    save(context, sbn.packageName, name, bitmap, sbn.postTime)
  }

  private fun findAvatar(context: Context, notification: Notification, extras: Bundle): Bitmap? {
    val icon: Icon? = notification.getLargeIcon()
    val drawable: Drawable? = try {
      icon?.loadDrawable(context)
    } catch (e: Exception) {
      null
    }
    val bitmap = drawable?.let { toBitmap(it) } ?: (extras.getParcelable<Bitmap>(Notification.EXTRA_LARGE_ICON))
    return bitmap?.let { Bitmap.createScaledBitmap(it, SIZE, SIZE * it.height / maxOf(1, it.width), true) }
  }

  private fun toBitmap(drawable: Drawable): Bitmap? {
    if (drawable is BitmapDrawable && drawable.bitmap != null) return drawable.bitmap
    val w = drawable.intrinsicWidth
    val h = drawable.intrinsicHeight
    if (w <= 0 || h <= 0) return null
    val bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
    drawable.setBounds(0, 0, w, h)
    drawable.draw(Canvas(bitmap))
    return bitmap
  }

  @Synchronized
  private fun save(context: Context, packageName: String, name: String, bitmap: Bitmap, time: Long) {
    val id = sha1("$packageName|${name.lowercase()}").take(16)
    val dir = File(context.filesDir, DIR).apply { mkdirs() }
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val pics = JSONArray(prefs.getString(KEY, "[]"))
    val bytes = java.io.ByteArrayOutputStream().also { bitmap.compress(Bitmap.CompressFormat.JPEG, 85, it) }.toByteArray()
    val hash = sha1(bytes)
    val file = File(dir, fileName(id, hash))
    val next = JSONArray()
    for (i in 0 until pics.length()) {
      val pic = pics.getJSONObject(i)
      if (pic.getString("id") != id) next.put(pic)
      else if (pic.optString("h") != hash) File(dir, fileName(id, pic.optString("h"))).delete()
    }
    if (!file.exists()) FileOutputStream(file).use { it.write(bytes) }
    next.put(JSONObject().put("id", id).put("p", packageName).put("name", name).put("t", time).put("h", hash))
    while (next.length() > MAX_PICS) {
      next.getJSONObject(0).let { File(dir, fileName(it.getString("id"), it.optString("h"))).delete() }
      next.remove(0)
    }
    prefs.edit().putString(KEY, next.toString()).apply()
  }

  @Synchronized
  fun list(context: Context): List<Map<String, Any>> {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val pics = JSONArray(prefs.getString(KEY, "[]"))
    val dir = File(context.filesDir, DIR)
    val result = mutableListOf<Map<String, Any>>()
    for (i in pics.length() - 1 downTo 0) {
      val pic = pics.getJSONObject(i)
      val file = File(dir, fileName(pic.getString("id"), pic.optString("h")))
      if (!file.exists()) continue
      result.add(
        mapOf(
          "id" to pic.getString("id"),
          "packageName" to pic.getString("p"),
          "name" to pic.getString("name"),
          "updatedAt" to pic.getLong("t").toDouble(),
          "uri" to "file://${file.absolutePath}",
        ),
      )
    }
    return result
  }

  @Synchronized
  fun delete(context: Context, id: String?) {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val pics = JSONArray(prefs.getString(KEY, "[]"))
    val next = JSONArray()
    for (i in 0 until pics.length()) {
      val pic = pics.getJSONObject(i)
      if (id == null || pic.getString("id") == id) File(File(context.filesDir, DIR), fileName(pic.getString("id"), pic.optString("h"))).delete()
      else next.put(pic)
    }
    prefs.edit().putString(KEY, next.toString()).apply()
  }

  /** Copies a cached pic so a person keeps it even if the cache is cleared. Returns its file uri. */
  @Synchronized
  fun copyForPerson(context: Context, id: String): String? {
    val pic = findPic(context, id) ?: return null
    val source = File(File(context.filesDir, DIR), fileName(id, pic.optString("h")))
    if (!source.exists()) return null
    val dir = File(context.filesDir, PERSON_DIR).apply { mkdirs() }
    val target = File(dir, "${id}-${System.currentTimeMillis()}.jpg")
    source.copyTo(target, overwrite = true)
    return "file://${target.absolutePath}"
  }

  private fun fileName(id: String, hash: String) = "$id-${hash.take(8)}.jpg"

  private fun findPic(context: Context, id: String): JSONObject? {
    val pics = JSONArray(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, "[]"))
    for (i in 0 until pics.length()) if (pics.getJSONObject(i).getString("id") == id) return pics.getJSONObject(i)
    return null
  }

  private fun sha1(text: String) = sha1(text.toByteArray())

  private fun sha1(bytes: ByteArray) =
    MessageDigest.getInstance("SHA-1").digest(bytes).joinToString("") { "%02x".format(it) }
}
