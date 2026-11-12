# Momentum

Your personal workout, supplement and macro tracker: a web app you add to your iPhone's
Home Screen. No Xcode needed.

## Put it on your iPhone
1. The `app/` folder is published automatically by GitHub Pages to
   `https://YOUR-GITHUB-USERNAME.github.io/momentum/` every time code is pushed
   (tests run first; see `.github/workflows/publish.yml`). Progress shows under the
   repository's **Actions** tab: a green check means it's live.
2. On your iPhone, open that address in **Safari**.
3. Tap the **Share** button (square with an arrow) → **Add to Home Screen** → **Add**.
4. Open Momentum from the new icon. It runs full screen, like a regular app.

⚠️ Your data lives inside the app on your phone. Deleting the Home Screen icon deletes the
data, so use the backup/export button once it's added (Milestone 6).

## Preview on your Mac (optional)
You need `python3`. If macOS offers to install "command line developer tools", say yes.
In Terminal, from this folder:

```bash
npm start
```

(or `python3 -m http.server 8000 --directory app` if you don't have Node), then open
http://localhost:8000 in Safari or Chrome. To see it phone-sized in Safari, use
Develop → Enter Responsive Design Mode.

## Run the tests (optional)
Install Node.js from nodejs.org (the "LTS" download), then in Terminal from this folder:

```bash
npm test
```

You should see `# fail 0`.

There are also click-through tests that use the whole app in a phone-sized browser:
see `tools/e2e/README.md` (run with `npm run e2e`).
