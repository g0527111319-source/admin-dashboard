# Reply to Google OAuth Verification — ready to send

**To:** (the same address that sent the verification request — reply directly to the thread)
**Subject:** Re: OAuth App Verification — Project ID crypto-resolver-446615-n1

---

Hello Google Developer Verification Team,

Thank you for the review. Below is our response addressing each of the three items you raised.

## 1. Domain verification

We have initiated domain ownership verification for **zirat-design.vercel.app** via Google Search Console.

Because the site is hosted on a `.vercel.app` subdomain, we have verified ownership using the HTML file / meta-tag method made available by Vercel (the Google verification tag has been embedded in the `<head>` of our homepage). The verification is visible at:
- Homepage: https://zirat-design.vercel.app
- Verification tag location: inside the `<head>` of the homepage (method: HTML meta tag).

If you require verification on an apex domain, we are prepared to migrate the production homepage to a custom root domain that we own; please let us know whether that is required and we will update the OAuth consent screen accordingly within 7 business days.

## 2. Privacy policy

We have fully rewritten the privacy policy at **https://zirat-design.vercel.app/privacy** so that it thoroughly discloses how the application interacts with Google user data. It now covers each of the five disclosure categories you require:

### a. Data Accessed

We request two OAuth scopes, both with explicit user consent:

- **`openid email profile`** — used only for "Sign in with Google". We receive the Google account ID (sub), email address, display name, and public profile picture.
- **`https://www.googleapis.com/auth/calendar`** — used only when the authenticated designer explicitly clicks "Connect Google Calendar" inside the CRM settings. It allows us to create, read, update, and delete events on the user's primary calendar.

### b. Data Usage

- Profile data (`email`, `name`, `picture`) is used solely to create or identify the user's account in our system and to render their name and avatar in the UI.
- Calendar access is used only to push meeting events the designer has created inside our CRM to their Google Calendar. We do not read, analyze, or repurpose calendar content beyond what is required to sync events the user created inside our platform.
- **We do not use Google user data for advertising, profiling, reselling, or for training AI/ML models.** This Limited Use commitment is stated explicitly in our privacy policy.

### c. Data Sharing

We do not sell, rent, or transfer Google user data to any third party.
Google user data is only transmitted back to Google APIs as strictly needed to perform the user-requested action.
The subprocessors that handle infrastructure are:
- **Vercel** — hosting and serverless runtime.
- **Managed PostgreSQL provider** — encrypted-at-rest database where OAuth tokens are stored.
- **Cloudflare R2** — storage of user-uploaded documents (PDFs, images). R2 does not store Google user data.
- **Resend** — sends transactional email (e.g., contract-signature notifications). Only the recipient's email address is shared with Resend, solely to deliver the user-requested message.

### d. Data Storage & Protection

- OAuth access and refresh tokens are stored in a dedicated database column encrypted in transit (TLS 1.2+) and at rest (disk-level encryption at our PostgreSQL provider).
- Database access is restricted to the site operator via unique credentials.
- All traffic is served over HTTPS with HSTS.
- Passwords are hashed with bcrypt.
- Sensitive operations (login, contract signing) are written to an audit log with timestamp and IP.

### e. Data Retention & Deletion

- **Active account:** data is retained as long as the account is active.
- **Google Calendar tokens:** deleted immediately when the user clicks "Disconnect" in the CRM settings, or when the user revokes access at https://myaccount.google.com/permissions.
- **Full account deletion:** can be requested at any time by emailing tamar@zirat.co.il with the subject "Delete my account". Deletion completes within 30 days and removes all profile data, content, Google tokens, and related records. Security logs are retained for a maximum of 90 days for abuse-prevention and compliance.
- **Backups:** kept for a maximum of 30 days and then permanently purged.

## 3. Demo video

A publicly accessible demo video has been uploaded and is available at:

**[PASTE YOUR UNLISTED/PUBLIC YOUTUBE URL HERE]**

The video shows:
- The OAuth consent screen as presented to a real user.
- The full user-facing flow that results in the scopes being requested.
- The exact features that each scope enables (Sign in with Google; Google Calendar sync inside the CRM).
- The application's branding and domain, matching the details in our OAuth consent screen configuration.

The video is hosted as an **unlisted** YouTube video (publicly accessible with the link, not indexed). Please let us know if a different format is required.

---

### Summary of changes

| Requirement | Status | Evidence |
|---|---|---|
| Homepage ownership | Verified via Google Search Console | Meta tag on homepage `<head>` |
| Privacy policy covers Google user data | Updated | https://zirat-design.vercel.app/privacy |
| Publicly accessible demo video | Uploaded | [YouTube unlisted URL] |

We remain at your disposal for any further clarification.

Best regards,
**Tamar** — Zirat Architecture
tamar@zirat.co.il
https://zirat-design.vercel.app

---

## ⚠️ Before pressing "send", make sure you have:

1. ✅ Replaced `[PASTE YOUR UNLISTED/PUBLIC YOUTUBE URL HERE]` with the real video URL.
2. ✅ Completed domain verification in Google Search Console (see `domain-verification-steps.md`).
3. ✅ Confirmed https://zirat-design.vercel.app/privacy loads the updated policy (Vercel should have redeployed within 1–2 min of the push).

If any of those isn't done yet, the reviewer will bounce the application again.
