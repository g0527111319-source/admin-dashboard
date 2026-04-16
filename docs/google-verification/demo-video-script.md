# Demo Video — Recording Script (ready to shoot)

**Target length:** 2–3 minutes
**Format:** 1080p screen recording with English narration (or Hebrew with English subtitles)
**Tool:** Any of — Loom (easiest, free), OBS Studio (free), or QuickTime (Mac)
**Host:** YouTube, set to **Unlisted** (not Private, not Public; Google wants a link that works without login)

## Why I can't record this for you

Recording requires a live browser session, mouse/keyboard control, and audio narration — I don't have the ability to physically control your screen and microphone. But **everything below is ready-to-perform**: open the URL, read the narration, click where indicated. No editing required — one take is fine.

---

## Required pre-recording setup

1. Open Chrome in a **clean incognito window** (so reviewers see a neutral UI, no personal extensions/bookmarks).
2. Have two test accounts ready:
   - A personal Google account you're okay seeing on video.
   - An existing designer account on zirat-design.vercel.app (or be ready to create one).
3. Open OBS / Loom and set **1920×1080 @ 30fps**, system audio OFF, mic ON.
4. Clear any open tabs except the one you're recording.

---

## Shot list + narration (read aloud while recording)

### Shot 1 — 0:00 → 0:10 — App introduction
**Screen:** Open https://zirat-design.vercel.app — the homepage of Zirat Architecture.
**Narration (English):**
> "This is Zirat Architecture — a web platform at zirat-design.vercel.app for interior designers and architects in Israel. It provides CRM, project management, contracts, and calendar features. I'm going to demonstrate the two Google scopes we request and how each one is used."

### Shot 2 — 0:10 → 0:25 — Show the privacy policy
**Screen:** Click the "מדיניות פרטיות" link in the footer (or navigate to /privacy). Scroll slowly through section 4 ("Google API").
**Narration:**
> "Our privacy policy explicitly documents the Google data we access, how we use it, how we store it, and how users can request deletion. It also includes a Limited Use disclosure in English for reviewers."

### Shot 3 — 0:25 → 0:55 — Sign in with Google (scope 1)
**Screen:**
1. Navigate to the designer login page (e.g. `/designer/login`).
2. Click "Sign in with Google".
3. Show the Google consent screen — it should list: *email, profile, openid*.
4. Pick a test account and consent.
5. Land on the designer dashboard.

**Narration:**
> "First scope: `openid email profile`. This is requested on the login page. The consent screen shows exactly the data we receive: the user's email, display name, and profile picture. We use this only to create or identify the user's account in our database and to render their name and avatar in the UI. We do not use it for advertising, profiling, or training any AI model."

### Shot 4 — 0:55 → 1:35 — Connect Google Calendar (scope 2)
**Screen:**
1. From the designer dashboard, go to CRM → Calendar.
2. Click the "חבר את Google Calendar" / "Connect Google Calendar" button.
3. The Google consent screen appears showing the calendar scope.
4. Consent.
5. Return to the CRM — show that the calendar is now connected.

**Narration:**
> "Second scope: `https://www.googleapis.com/auth/calendar`. This scope is requested **only** when the designer explicitly clicks 'Connect Google Calendar' inside the CRM settings. The consent screen is shown, the user approves, and on return the integration is active. This scope is used solely to push meeting events that the designer creates inside our CRM to their Google Calendar. We do not read or analyze the user's existing calendar content."

### Shot 5 — 1:35 → 2:10 — Demonstrate the calendar sync use-case
**Screen:**
1. Create a new event inside the CRM calendar (title: "Client meeting — Tel Aviv").
2. Save.
3. Click "Sync now" or wait for automatic sync.
4. Open Google Calendar in a new tab — show the event has appeared.

**Narration:**
> "Here I create a meeting inside our CRM. Upon sync, the event is pushed to the user's primary Google Calendar with the matching title, date, and time. This is the only interaction the application has with calendar data — pushing events the designer created on our platform."

### Shot 6 — 2:10 → 2:30 — Disconnect / data deletion
**Screen:**
1. Back in CRM → Calendar settings.
2. Click "ניתוק" / "Disconnect".
3. Confirm — show that the integration now reads "Not connected".

**Narration:**
> "The user can revoke access at any time from inside the app by clicking Disconnect — which immediately deletes the stored OAuth tokens from our database — or via the Google account permissions page. Full account deletion can be requested by email and is completed within 30 days."

### Shot 7 — 2:30 → 2:45 — Wrap-up
**Screen:** Back to homepage or privacy page.
**Narration:**
> "To summarize: Zirat Architecture uses two Google scopes — `openid email profile` for Sign in with Google, and `calendar` for CRM-to-Google Calendar sync — both opt-in and used strictly to deliver the user-facing feature. Our privacy policy is at zirat-design.vercel.app/privacy. Thank you for the review."

---

## Post-recording checklist

- [ ] Export as MP4.
- [ ] Upload to YouTube → set to **Unlisted**.
- [ ] Paste the unlisted URL into the reply email (replace `[PASTE YOUR UNLISTED/PUBLIC YOUTUBE URL HERE]`).
- [ ] Double-check you can open the YouTube link in an **incognito window** without signing in — if it asks you to log in, it's set to Private, not Unlisted. Fix before sending.

---

## If you really don't want to record yourself

Alternatives Google also accepts:
1. **Loom** — one-click browser recording with narration, auto-hosted; paste the share URL directly.
2. **Pair up with a colleague** — have someone else click through while you narrate.
3. **Use text overlays instead of voice** — OBS/Loom both let you add captions post-hoc if you'd rather not narrate.

Google's reviewers are instructed to watch the full video end-to-end. A clear, branded 2-minute walkthrough passes; a silent or generic one often gets rejected.
