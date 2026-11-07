import { requireOptionalNativeModule } from 'expo';

type DevHandoffEvents = {
  onIncomingFile: () => void;
};

interface DevHandoffNativeModule {
  getPackageName(): string;
  sendFile(fileUri: string, targetPackage: string, mimeType: string): Promise<boolean>;
  takePendingFile(): Promise<string | null>;
  addListener<E extends keyof DevHandoffEvents>(event: E, listener: DevHandoffEvents[E]): { remove(): void };
}

/** Android-only. `null` on iOS, web, and builds made before this module existed. */
export const DevHandoff = requireOptionalNativeModule<DevHandoffNativeModule>('DevHandoff');

const DEV_SUFFIX = '.dev';
const VARIANT_SUFFIXES = ['.dev', '.preview'];

/** `com.example.app.preview` → `com.example.app.dev`. */
export function getDevPackageName(packageName: string): string {
  const suffix = VARIANT_SUFFIXES.find(s => packageName.endsWith(s));
  const base = suffix ? packageName.slice(0, -suffix.length) : packageName;
  return `${base}${DEV_SUFFIX}`;
}

export function isDevPackageName(packageName: string): boolean {
  return packageName.endsWith(DEV_SUFFIX);
}

/** True in prod/preview builds that have the native module, i.e. the ones that can send to dev. */
export function canSendToDev(): boolean {
  return DevHandoff != null && !isDevPackageName(DevHandoff.getPackageName());
}

/** True in the dev build, which receives files. */
export function canReceiveFromProd(): boolean {
  return DevHandoff != null && isDevPackageName(DevHandoff.getPackageName());
}

/** Opens a cached file:// URI in this app's dev build. Resolves false if the dev build isn't installed. */
export async function sendFileToDev(fileUri: string, mimeType = 'application/json'): Promise<boolean> {
  if (!DevHandoff) return false;
  return DevHandoff.sendFile(fileUri, getDevPackageName(DevHandoff.getPackageName()), mimeType);
}

/** Calls `onFile` with a file:// URI for each file the app is opened with: on launch and while running. */
export function subscribeToIncomingFiles(onFile: (fileUri: string) => void): () => void {
  const native = DevHandoff;
  if (!native) return () => {};
  const take = () => {
    native
      .takePendingFile()
      .then(uri => {
        if (uri) onFile(uri);
      })
      .catch(() => {});
  };
  take();
  const subscription = native.addListener('onIncomingFile', take);
  return () => subscription.remove();
}
