# KMCC Membership Management System

A web-based membership management system for KMCC (Kerala Muslim Cultural Centre) built with Supabase and vanilla JavaScript.

## Features

- **Member Registration**: Personal/nominee details and profile photo upload
- **Real-time Updates**: Auto notifications when approved/rejected
- **ID Card Generation**: One-click PNG download from the member page
- **Dynamic District/Area**: Populated from the database
- **Tailwind CSS**: Responsive UI

## Prerequisites

- Supabase project (URL + anon key)
- Node.js + npm
- GitHub account (for Pages)

## Local Setup

1) Configure Supabase

```powershell
Copy-Item supabase.config.template.js supabase.config.js
# Edit supabase.config.js and set your Supabase URL + anon key
```

2) Install deps and build CSS

```powershell
npm install
npm run build
```

3) Run locally

```powershell
npx http-server -c-1 .
# Open http://127.0.0.1:8080/index.html
```

## Publish to GitHub Pages (safe key handling)

This repo includes a workflow at `.github/workflows/deploy.yml` that:
- Builds Tailwind CSS
- Creates `supabase.config.js` at deploy time from GitHub Secrets
- Publishes the site to GitHub Pages

Steps to publish:

1) Create a GitHub repo named `kmcc-membership` and push this code
2) Add repository Secrets (Settings → Secrets and variables → Actions):
   - `SUPABASE_URL` → your project URL (e.g. https://xyzcompany.supabase.co)
   - `SUPABASE_ANON_KEY` → your anon key
3) In Settings → Pages, set Source to "GitHub Actions"
4) Push to `main` (or run the workflow from the Actions tab)
5) Your site will appear at `https://YOUR_USERNAME.github.io/kmcc-membership/`

Notes:
- CSS path is relative (`./dist/output.css`) so it works under `/kmcc-membership/`.
- `supabase.config.js` is generated only in the deploy artifact; it remains gitignored in your repo.

## Security Notes

- Supabase anon key is public by design for client apps; protect data using Row Level Security (RLS) and policies.
- Never expose the service role key in the client or repository.
- Keep `supabase.config.js` out of git (already in `.gitignore`). For production, the GitHub Action injects it using Secrets.

## Useful Scripts

```powershell
npm run build   # Build Tailwind CSS to ./dist/output.css
npm run watch   # Watch mode during development
```

## Tech

- Supabase (DB, Storage, Realtime)
- Vanilla JS (ES modules)
- Tailwind CSS
- html2canvas (ID card PNG)
- GitHub Pages
## Deploy to Netlify

Netlify can build the site and inject your Supabase keys securely using environment variables.

This repo includes `netlify.toml` which:
- Writes `supabase.config.js` from `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- Runs `npm ci` and `npm run build`
- Publishes the repo root (`.`)

Steps:
1) Push this repo to GitHub (or import directly in Netlify)
2) In Netlify Dashboard: Add new site → Import from Git → pick your repo
3) Build settings (Netlify will auto-detect from `netlify.toml`):
   - Build command: defined in `netlify.toml`
   - Publish directory: `.`
4) Add environment variables (Site settings → Environment variables):
   - `SUPABASE_URL` = your Supabase project URL
   - `SUPABASE_ANON_KEY` = your Supabase anon key
5) Deploy site

The site URL will look like `https://<your-site-name>.netlify.app/` (you can configure a custom domain later).

Notes:
- `supabase.config.js` is generated at build time and not committed.
- The anon key is safe for client use; secure data with RLS and policies.
