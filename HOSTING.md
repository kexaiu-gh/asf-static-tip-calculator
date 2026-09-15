# Hosting Tip calculator

This folder is the complete application. It is plain HTML, CSS and JavaScript - no framework, no build step, nothing to install and nothing that ever needs updating.

## To put it online

Upload every file in this folder to any of:

- any shared/cPanel host (into public_html)
- Netlify (drag the folder onto app.netlify.com/drop)
- GitHub Pages, Vercel, Cloudflare Pages
- an S3/GCS bucket with static website hosting
- any web server (nginx, Apache) - serve the folder as-is

Open the site. That is the whole procedure.

_Note: wrangler declares d1 bindings the UI never uses - factory plumbing, not an app dependency._

---
Exported by the AI Factory. The excluded `worker.js` is Cloudflare-specific serving plumbing, not application code.
