const assert = require('node:assert/strict');
const { test } = require('node:test');

const withAlarmScheduler = require('../app.plugin');

// Runs the plugin's Android manifest mod against a manifest document shaped like the one
// `withAndroidManifest` hands to mods: `{ manifest: { $, application, ... } }`.
async function runManifestMod(props, manifest = emptyManifest()) {
  const config = withAlarmScheduler({ name: 'test', slug: 'test' }, props);
  const result = await config.mods.android.manifest({
    name: 'test',
    slug: 'test',
    modResults: manifest,
    modRequest: { platform: 'android', modName: 'manifest', projectRoot: '/project' },
  });
  return permissionNames(result.modResults);
}

function emptyManifest() {
  return {
    manifest: {
      $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' },
      application: [{ $: { 'android:name': '.MainApplication' } }],
    },
  };
}

function permissionNames(manifest) {
  return (manifest.manifest['uses-permission'] || []).map((item) => item.$['android:name']);
}

test('adds the default alarm permissions', async () => {
  const permissions = await runManifestMod({});
  assert.deepEqual(permissions.sort(), [
    'android.permission.POST_NOTIFICATIONS',
    'android.permission.SCHEDULE_EXACT_ALARM',
    'com.android.alarm.permission.SET_ALARM',
  ]);
});

test('USE_EXACT_ALARM is opt-in', async () => {
  const permissions = await runManifestMod({ addUseExactAlarmPermission: true });
  assert.ok(permissions.includes('android.permission.USE_EXACT_ALARM'));
});

test('default permissions can be turned off', async () => {
  const permissions = await runManifestMod({
    addExactAlarmPermission: false,
    addNotificationPermission: false,
  });
  assert.deepEqual(permissions, ['com.android.alarm.permission.SET_ALARM']);
});

test('does not duplicate permissions the manifest already declares', async () => {
  const manifest = emptyManifest();
  manifest.manifest['uses-permission'] = [
    { $: { 'android:name': 'android.permission.POST_NOTIFICATIONS' } },
  ];
  const permissions = await runManifestMod({}, manifest);
  assert.equal(
    permissions.filter((name) => name === 'android.permission.POST_NOTIFICATIONS').length,
    1
  );
  assert.equal(permissions.length, 3);
});
