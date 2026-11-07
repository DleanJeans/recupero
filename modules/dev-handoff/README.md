# dev-handoff

Android-only local Expo module that sends a data file from a prod/preview build straight into the
same app's dev build (`<package>.dev`), which then offers to import it. No share sheet, no Files app.

It knows nothing about Recupero, so it can be copied into another Expo app as is.

## Drop into another app

1. Copy `modules/dev-handoff/` into the app's `modules/` folder (autolinked like any local Expo module).
2. Give the variants distinct package names: `com.x.app` (prod), `com.x.app.preview`, `com.x.app.dev`.
3. In `app.config.ts`, add to `android.intentFilters` for the dev variant only:
   ```ts
   { action: 'VIEW', data: [{ scheme: 'content', mimeType: 'application/json' }], category: ['DEFAULT'] },
   { action: 'SEND', data: [{ mimeType: 'application/json' }], category: ['DEFAULT'] },
   ```
4. Sender (prod/preview): write the backup JSON to the cache dir (`new File(Paths.cache, name)`), then
   `await sendFileToDev(file.uri)`. Show the button only when `canSendToDev()` is true.
5. Receiver (dev): once stores are hydrated, `subscribeToIncomingFiles(uri => /* confirm, then import */)`
   and gate it on `canReceiveFromProd()`.

Both builds need a fresh native build (APK) once after adding the module; OTA updates alone can't add it.
In Recupero see `src/utils/data-transfer.ts` (`sendToDevBuild`) and `src/hooks/use-dev-handoff-import.ts`.
