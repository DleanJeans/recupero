const { withAndroidColors, withAndroidStyles, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs/promises');
const path = require('path');

const LOADER_XML = `<animated-vector xmlns:android="http://schemas.android.com/apk/res/android">
  <aapt:attr name="android:drawable" xmlns:aapt="http://schemas.android.com/aapt">
    <vector
      android:width="64dp"
      android:height="64dp"
      android:viewportWidth="64"
      android:viewportHeight="64">
      <group
        android:name="rotation"
        android:pivotX="32"
        android:pivotY="32">
        <path
          android:fillColor="@android:color/transparent"
          android:pathData="M32,5 A27,27 0,1 1,5,32"
          android:strokeColor="#FFFFFFFF"
          android:strokeWidth="5" />
      </group>
    </vector>
  </aapt:attr>
  <target
    android:name="rotation"
    android:animation="@animator/splashscreen_loader_rotation" />
</animated-vector>
`;

const ROTATION_ANIMATOR_XML = `<objectAnimator xmlns:android="http://schemas.android.com/apk/res/android"
  android:duration="900"
  android:propertyName="rotation"
  android:repeatCount="infinite"
  android:repeatMode="restart"
  android:valueFrom="0"
  android:valueTo="360" />
`;

function withLoadingSplash(config) {
  config = withAndroidColors(config, config => {
    const { modResults } = config;
    const colors = modResults.resources.color ?? [];
    const splashBackground = colors.find(({ $ }) => $.name === 'splashscreen_background');

    if (splashBackground) {
      splashBackground._ = '#121212';
    } else {
      colors.push({
        _: '#121212',
        $: { name: 'splashscreen_background' },
      });
      modResults.resources.color = colors;
    }

    return config;
  });

  config = withAndroidStyles(config, config => {
    const { modResults } = config;
    const splashStyle = modResults.resources.style?.find(({ $ }) => $.name === 'Theme.App.SplashScreen');

    if (!splashStyle) {
      return config;
    }

    const icon = splashStyle.item?.find(({ $ }) => $.name === 'windowSplashScreenAnimatedIcon');

    if (icon) {
      icon._ = '@drawable/splashscreen_loader';
    } else {
      splashStyle.item = splashStyle.item ?? [];
      splashStyle.item.push({
        _: '@drawable/splashscreen_loader',
        $: { name: 'windowSplashScreenAnimatedIcon' },
      });
    }

    return config;
  });

  return withDangerousMod(config, [
    'android',
    async ({ modRequest, ...config }) => {
      const resourcesDir = path.join(modRequest.platformProjectRoot, 'app/src/main/res');
      const drawableDir = path.join(resourcesDir, 'drawable');
      const animatorDir = path.join(resourcesDir, 'animator');

      await fs.mkdir(drawableDir, { recursive: true });
      await fs.mkdir(animatorDir, { recursive: true });
      await fs.writeFile(path.join(drawableDir, 'splashscreen_loader.xml'), LOADER_XML);
      await fs.writeFile(path.join(animatorDir, 'splashscreen_loader_rotation.xml'), ROTATION_ANIMATOR_XML);

      const launcherBackgroundPath = path.join(drawableDir, 'ic_launcher_background.xml');

      try {
        const launcherBackground = await fs.readFile(launcherBackgroundPath, 'utf8');
        await fs.writeFile(
          launcherBackgroundPath,
          launcherBackground.replace('@color/splashscreen_background', '@color/iconBackground'),
        );
      } catch {
        // The launcher background is generated only for Android icon builds.
      }

      return { ...config, modRequest };
    },
  ]);
}

module.exports = withLoadingSplash;
