# Domain Verification — step by step

Google's email says:
> "The website you provided as your homepage is not registered to you. Verify your ownership of the following domains: zirat-design.vercel.app"

## Good news

The homepage **already has** the Google Search Console meta tag embedded in its `<head>`:

```html
<meta name="google-site-verification" content="yfcoIh96qYOARTamBbB2-Tq1ZTWaNmkdUce1stOym1s" />
```

This was set up previously (see `src/app/layout.tsx` line 48). So for Google Search Console, the file is in place — you just need to push the "Verify" button.

## Steps

### Step 1 — Verify in Google Search Console (for the meta tag)

1. Open https://search.google.com/search-console.
2. If you don't see `zirat-design.vercel.app` in your property list, click **Add property** → choose **URL prefix** → enter:
   ```
   https://zirat-design.vercel.app/
   ```
3. When prompted for a verification method, pick **HTML tag**.
4. It will show a meta tag that looks like:
   `<meta name="google-site-verification" content="..." />`
5. **Compare the `content` value** to the one in `src/app/layout.tsx` line 48 (`yfcoIh96qYOARTamBbB2-Tq1ZTWaNmkdUce1stOym1s`).
   - **If identical:** just click the green **Verify** button — you're done.
   - **If different:** copy the new value, update `src/app/layout.tsx` line 48 with it, commit + push, wait 1–2 min for Vercel to redeploy, then click Verify.

### Step 2 — Link the verified domain to your Google Cloud project

1. Open https://console.cloud.google.com/apis/credentials/consent?project=crypto-resolver-446615-n1
   (that's your project ID from the email).
2. Under **Authorized domains**, click **Add domain**.
3. Enter: `zirat-design.vercel.app`
4. Save.

### Step 3 — Also check the Domain verification page

1. Open https://console.cloud.google.com/apis/credentials/domainverification?project=crypto-resolver-446615-n1
2. If `zirat-design.vercel.app` is not listed, click **Add domain** and paste it in.
3. If it asks you to verify in Search Console, click the link — since Step 1 is already done, this should complete instantly.

---

## ⚠️ Known risk with `.vercel.app` subdomains

Google's verification can sometimes reject `.vercel.app` subdomains on the grounds that "the domain is not registered to you" — technically the `vercel.app` root is owned by Vercel Inc., not by you. In that case you have two options:

### Option A — add a custom domain (recommended long-term)

1. Buy a domain you own (e.g. `zirat.co.il` if it's yours, or `zirat-design.com`).
2. In Vercel dashboard → your project → Settings → Domains → add the custom domain. Vercel will give you DNS records to add at your registrar.
3. Once DNS propagates, the site will be reachable at the new domain too.
4. Update the OAuth consent screen to use the new domain as the homepage.
5. Verify the new domain in Search Console (add the meta tag via `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` env var or update the hard-coded tag).

**In the reply to Google, mention that you're prepared to migrate to a custom domain if required.** This is already in the email draft.

### Option B — try to proceed with `.vercel.app` + explicit mention

Many small apps have successfully verified on `.vercel.app` subdomains once Search Console verification is complete. In the reply email we explicitly state this is how we verified and offer to migrate. If Google rejects, they will say so — and you'll go with Option A.

---

## Quick sanity check before replying

Run these from any machine (or browser):

```bash
# Meta tag is present on homepage
curl -s https://zirat-design.vercel.app | grep "google-site-verification"
# Expected output: <meta name="google-site-verification" content="yfcoIh96qYOARTamBbB2-Tq1ZTWaNmkdUce1stOym1s" />

# Privacy policy is live with the Google section
curl -s https://zirat-design.vercel.app/privacy | grep -i "Limited Use"
# Expected: at least one match (the Limited Use disclosure)
```

If both succeed → you're ready to send the reply email.
