import fs from 'node:fs';

const manifestPath = 'android/app/src/main/AndroidManifest.xml';

if (!fs.existsSync(manifestPath)) {
  throw new Error('AndroidManifest.xml not found. Run npx cap add android first.');
}

let manifest = fs.readFileSync(manifestPath, 'utf8');

const activityPattern = /<activity\b([\s\S]*?android:name="\.MainActivity"[\s\S]*?)>/;
const match = manifest.match(activityPattern);

if (!match) {
  throw new Error('MainActivity entry not found in AndroidManifest.xml.');
}

if (!/android:screenOrientation=/.test(match[0])) {
  const updatedActivity = match[0].replace(
    /<activity\b/,
    '<activity\n            android:screenOrientation="portrait"'
  );
  manifest = manifest.replace(match[0], updatedActivity);
}

fs.writeFileSync(manifestPath, manifest);
console.log('Android native configuration applied: portrait orientation.');
