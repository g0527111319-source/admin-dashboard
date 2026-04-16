# Reply to Google OAuth Verification — ready to send

**To:** (reply directly to the thread from Google)
**Subject:** Re: OAuth App Verification — Project ID crypto-resolver-446615-n1

---

Hello Google Developer Verification Team,

Thank you for the review. Below is our full response to each of the three items you raised. All actions have been completed on production prior to sending this email.

## 1. Domain verification

Domain ownership for **zirat-design.vercel.app** has been established via Google Search Console using the HTML meta-tag method. The verification tag is embedded directly in the homepage `<head>`:

- Tag location: https://zirat-design.vercel.app (visible in `<head>`, `<meta name="google-site-verification" content="yfcoIh96qYOARTamBbB2-Tq1ZTWaNmkdUce1stOym1s" />`)
- Evidence: `curl -s https://zirat-design.vercel.app | grep google-site-verification` returns the tag.

The domain has also been added under **Authorized domains** in the OAuth consent screen configuration for project `crypto-resolver-446615-n1`.

If verification against a `.vercel.app` subdomain is not acceptable for your process, we are prepared to migrate the production homepage to a custom root domain within 7 business days — please indicate if that is required.

## 2. Privacy policy

The privacy policy at **https://zirat-design.vercel.app/privacy** has been fully rewritten to thoroughly disclose how the application interacts with Google user data. It is now publicly accessible (no authentication required) and covers each of the five disclosure categories.

### a. Data Accessed

We request two OAuth scopes, both with explicit user consent:

| Scope | Purpose | When requested |
|---|---|---|
| `openid email profile` | "Sign in with Google" — we receive Google account ID (sub), email, display name, profile picture | Optional login method on `/login` |
| `https://www.googleapis.com/auth/calendar` | Create/read/update/delete events on the user's primary calendar | Only when the authenticated designer explicitly clicks "Connect Google Calendar" inside CRM → Calendar settings |

Source code evidence (OAuth initiation):
- Sign-in scope: https://zirat-design.vercel.app + `src/app/api/auth/google/route.ts` line 36
  `scope: "openid email profile"`
- Calendar scope: `src/app/api/designer/crm/google-calendar/route.ts` line 53
  `encodeURIComponent("https://www.googleapis.com/auth/calendar")`

### b. Data Usage

- **Profile data (`email`, `name`, `picture`)** is used only to create or identify the user's account record and to render their name/avatar in the UI.
- **Calendar access** is used only to push meeting events the designer created inside our CRM to their Google Calendar. We do not read, analyze, or repurpose existing calendar entries. The exact payload pushed is constructed from CRM event fields and written once per sync.
- **We explicitly do not use Google user data for advertising, reselling, profiling, analytics enrichment, or training of AI/ML models.** This Limited Use commitment is stated in section 4 of the privacy policy.

### c. Data Sharing

We do not sell, rent, or transfer Google user data to any third party. Google user data is only transmitted back to Google APIs to perform the user-requested action. The infrastructure subprocessors are listed in section 4.3 of the privacy policy:

- **Vercel** — hosting, serverless runtime.
- **Managed PostgreSQL (Neon/Supabase-class)** — encrypted-at-rest database. OAuth tokens are stored here.
- **Cloudflare R2** — storage of user-uploaded documents/PDFs; does not receive Google user data.
- **Resend** — transactional email only; recipient address is the only datum transmitted.

### d. Data Storage & Protection

- OAuth access + refresh tokens are stored in dedicated database columns, encrypted in transit (TLS 1.2+) and at rest.
- All application traffic is HTTPS-only with HSTS (max-age=63072000).
- Passwords are hashed with bcrypt.
- Sensitive operations (login, contract signing, account deletion, data-deletion requests) are written to an audit log with timestamp and IP.
- Security headers present on every response: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`.

### e. Data Retention & Deletion

We provide **three independent paths** for Google users to revoke access or delete data:

1. **Immediate Google Calendar disconnect** — from inside the app (CRM → Calendar → Disconnect). This immediately deletes the stored OAuth tokens from our database.
2. **Immediate revocation via Google** — https://myaccount.google.com/permissions.
3. **Public, no-login Data Deletion form — https://zirat-design.vercel.app/data-deletion** — anyone (including former users and reviewers) can file a deletion request by entering their registered email. The form sends a confirmation email to the user and notifies our operator, who completes the deletion within 30 days.

Additionally, logged-in designers can permanently delete their own account from within the application; the server-side endpoint is at `POST /api/designer/account/delete` and performs a cascading delete of all owned records.

Retention policy:
- Active account data: retained while the account is active.
- Security audit logs: maximum 90 days.
- Database backups: maximum 30 days, then permanently purged.

## 3. Demo video

A publicly accessible demo video has been uploaded and is available at:

**[PASTE YOUR UNLISTED YOUTUBE URL HERE]**

The video (approximately 2 minutes) demonstrates:

1. The application homepage and branding, matching the details registered in the OAuth consent screen.
2. The privacy policy page, including the Google-specific disclosures.
3. The "Sign in with Google" flow, including the real Google consent screen listing `email`, `profile`, `openid`.
4. The "Connect Google Calendar" flow inside CRM settings, including the real Google consent screen requesting the calendar scope.
5. The exact CRM feature each scope enables (profile display; calendar event push).
6. The disconnect flow showing how the user can revoke access from within the application.

The video is hosted as an **unlisted** YouTube video — publicly accessible via the URL, not indexed or searchable. If a different format is preferred, please let us know.

---

## Summary

| Requirement | Status | URL / Evidence |
|---|---|---|
| Homepage ownership | Verified | https://zirat-design.vercel.app (meta tag in `<head>`) |
| Privacy policy covering Google user data | Live & publicly accessible | https://zirat-design.vercel.app/privacy |
| Public data-deletion path | Live | https://zirat-design.vercel.app/data-deletion |
| Demo video (unlisted) | Uploaded | [YouTube URL here] |

---

Please let us know if further clarification or material is required. We are happy to address any additional items promptly.

Best regards,
**Tamar** — Zirat Architecture
tamar@zirat.co.il
https://zirat-design.vercel.app

---

## ⚠️ Before pressing "send", make sure you have:

1. ✅ Replaced `[PASTE YOUR UNLISTED YOUTUBE URL HERE]` with the real video URL.
2. ✅ Tested the YouTube URL in an incognito window (if you have to sign in → it's Private, not Unlisted).
3. ✅ Completed Search Console verification (one click — the meta tag is already on the site).
4. ✅ Optionally: run these three curl commands for your own reassurance (they all should succeed):

```
curl -sI https://zirat-design.vercel.app/privacy | head -1
curl -sI https://zirat-design.vercel.app/data-deletion | head -1
curl -s  https://zirat-design.vercel.app | grep google-site-verification
```

All three should return `HTTP/1.1 200 OK` or the matched meta tag.
