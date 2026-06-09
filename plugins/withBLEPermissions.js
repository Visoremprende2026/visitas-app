const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withBLEPermissions(config) {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults.manifest;

    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    const permissions = manifest['uses-permission'];

    let found = false;

    for (let i = 0; i < permissions.length; i++) {
      if (
        permissions[i].$['android:name'] ===
        'android.permission.BLUETOOTH_SCAN'
      ) {
        permissions[i].$['android:usesPermissionFlags'] =
          'neverForLocation';
        found = true;
      }
    }

    if (!found) {
      permissions.push({
        $: {
          'android:name': 'android.permission.BLUETOOTH_SCAN',
          'android:usesPermissionFlags': 'neverForLocation',
        },
      });
    }

    return config;
  });
};