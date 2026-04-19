# TWA (Trusted Web Activity) — Android App Build

This folder contains configuration for building the Android app that wraps
the Zirat Adrichalut website and publishes to Google Play.

## How it works

A TWA is a thin native Android app (APK/AAB) that launches the website
inside a Chrome Custom Tab in fullscreen mode. To Google Play it looks like
a real native app, but the content is served by the same Next.js site at
`https://www.ziratadrichalut.co.il`. Any change to the website is instantly
reflected in the app — no need to republish.

## Prerequisites (one-time)

1. **Node.js 18+** (already present)
2. **Java Development Kit (JDK) 17** — required by Bubblewrap to build the
   Android app. Download: https://adoptium.net/temurin/releases/?version=17
3. **Android SDK** — Bubblewrap installs it automatically on first run,
   but you can also install Android Studio to get it.

## Build steps

From the project root:

```bash
# Install Bubblewrap CLI globally
npm install -g @bubblewrap/cli

# Initialize (first time only — uses our twa-manifest.json)
cd twa
bubblewrap init --manifest=./twa-manifest.json

# Build the AAB (Android App Bundle — what Play Store wants)
bubblewrap build
```

Bubblewrap will prompt you to create a signing key the first time. Answer:

- **Password for keystore:** choose a strong one and **save it permanently**
- **Password for the key:** same (can be different)
- **First and last name:** Israel Goldschmid (or your org name)
- **Organizational Unit:** Zirat Adrichalut
- **Organization:** Zirat Adrichalut
- **Country code:** IL

⚠️ **The keystore file (`android.keystore`) and its password are CRITICAL.**
If lost, you can NEVER update the app on Play — you'd have to publish under
a new package name and lose all users. **Back it up securely** (1Password,
encrypted cloud, offline copy).

After build, you get:
- `app-release-bundle.aab` ← upload this to Play Console
- `app-release-signed.apk` ← for local testing on your device

## After first build — update assetlinks.json

Get the SHA256 fingerprint of your signing key:

```bash
keytool -list -v -keystore android.keystore -alias android
```

Copy the **SHA256** line and replace `PLACEHOLDER_REPLACE_WITH_PLAY_APP_SIGNING_SHA256_FINGERPRINT`
in `public/.well-known/assetlinks.json`, then redeploy the website.

**Alternative: use Play App Signing** (recommended by Google)

In Play Console, upload your AAB and enable "Play App Signing". Google will
re-sign the app with their own key. Then go to **Release → Setup → App signing**
and copy the **App signing key certificate SHA-256 fingerprint**. Paste
THAT fingerprint into assetlinks.json (not your upload key's).

## Updating the app later

When the website design/features change — **no rebuild needed**. The app
just loads the updated website.

Rebuild only when you need to:
- Update the app icon or splash screen
- Change the package name or version
- Add new Play features (IAP, notifications permissions, etc.)

To publish a new version:
```bash
bubblewrap update         # pulls latest manifest from website
bubblewrap build          # rebuild AAB
```
Increment `appVersionCode` in `twa-manifest.json` (must be higher each time).
