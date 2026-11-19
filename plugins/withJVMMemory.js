const { withGradleProperties } = require('expo/config-plugins');

/**
 * Expo config plugin to configure Gradle JVM memory settings.
 * This prevents OutOfMemoryError: Metaspace during Kotlin KSP tasks.
 * It also disables the Gradle daemon to prevent zombie processes from hanging the build.
 */
module.exports = function withJVMMemory(config) {
  return withGradleProperties(config, config => {
    const props = config.modResults;

    const setGradleProperty = (key, value) => {
      const index = props.findIndex(p => p.type === 'property' && p.key === key);
      if (index >= 0) {
        props[index].value = value;
      } else {
        props.push({ type: 'property', key, value });
      }
    };

    setGradleProperty(
      'org.gradle.jvmargs',
      '-Xmx3g -XX:MaxMetaspaceSize=2g -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8 --enable-native-access=ALL-UNNAMED',
    );
    // Disable the Gradle daemon to prevent zombie daemon processes from hanging
    // the build after an OutOfMemoryError failure
    setGradleProperty('org.gradle.daemon', 'false');
    // On fresh CI runners CMake is installed on first use; with parallel tasks the CMake configure tasks of
    // react-native-screens, worklets and expo-updates all started at once and failed together (2026-11-19).
    setGradleProperty('org.gradle.parallel', 'false');

    return config;
  });
};
