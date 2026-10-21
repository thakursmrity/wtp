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
