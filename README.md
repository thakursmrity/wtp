# Why That Product

The home site for Why That Product: product teardowns, user discovery learned in public, and interview prep, by Smrity.

It is a plain static site (HTML, CSS and a little JavaScript). There is no build step.

## Pages

- `index.html` is the home page, with the interactive teardown
- `about.html` covers what this is, who it's for, and the ground rules
- `content.html` shows the four formats
- `journey.html` is the build log
- `connect.html` has ways to get in touch and the social links
- `404.html` is the not-found page

## Deploy on Vercel

1. Import this repo at vercel.com/new.
2. Leave the framework preset on "Other". Leave the build command and output directory empty.
3. Deploy. Add your domain under Project Settings, then Domains.

## Run locally

```
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Where to edit things

- Colors and type live at the top of `assets/style.css`.
- Social links and the contact email are in the footer and on `connect.html`. They assume the handle `whythatproduct` on every platform and the inbox `whythatproduct@gmail.com`. Search and replace if yours differ.
- The interactive teardown content is in the `data-q` and `data-a` attributes on the pink pins in `index.html`.

## Contact form and private inbox

The Connect page has a real contact form. Messages are saved to a small database and show up in a private inbox at `/admin`.

### One-time setup in Vercel

1. In your Vercel project, open **Storage**, create an **Upstash Redis** database and connect it to this project. Vercel adds the connection variables for you.
2. In **Settings, Environment Variables**, add:
   - `ADMIN_PASSWORD`: the password you will type at `/admin`. Make it long.
   - `SESSION_SECRET`: any random string of 16 or more characters. Keep it private.
3. Optional, for an email ping when a message arrives: sign up at resend.com, create an API key, and add `RESEND_API_KEY` and `NOTIFY_EMAIL`. Until you verify a domain with Resend, `NOTIFY_EMAIL` must be the same email you signed up to Resend with.
4. **Redeploy** so the new variables take effect.

Never put the password, secret or keys in the repo or in chat. Until setup is done, the form tells visitors to email you instead, and `/admin` shows a setup message.

### How it is protected

Honeypot field for bots, a limit of 5 messages per hour per visitor, 5 login attempts per 15 minutes, a signed HttpOnly session cookie, and `/admin` is marked noindex. Visitor IPs are never stored.
