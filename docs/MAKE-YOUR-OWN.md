# Make your own Momentum

This guide is for a friend who wants **her own copy** of Momentum: her own web address,
her own colors, quotes and defaults, and the freedom to change anything. No coding
experience needed for most of it. It takes about 20 minutes and costs nothing
(except AI meal estimates, which you pay Anthropic for yourself, usually a few cents each).

> **Just want to use the app, not customize it?** Skip all of this. Open
> <https://riddhipatil1218.github.io/Momentum/> in Safari on your iPhone, tap
> **Share → Add to Home Screen**, and you're done. Your data stays on your phone and is
> completely separate from everyone else's.

---

## What you're about to do (the big picture)

- The app's code lives in a **repository** (a project folder with its full history) on a
  website called **GitHub**.
- **Forking** makes your own copy of that repository in your GitHub account. After that,
  it's yours. Changes you make don't affect the original, and changes to the original
  don't affect yours unless you choose to pull them in.
- **GitHub Pages** turns your copy into a website with your own address, like
  `https://YOUR-USERNAME.github.io/momentum/`.
- Every time you change a file, a robot called **GitHub Actions** checks the app (about
  100 automatic tests) and, if everything passes, republishes your site. If a test fails,
  your site simply keeps the last version that worked.

**Your data never goes to GitHub.** Workouts, meals, weight and stats live only on your
phone. GitHub only holds the app's code, and the code is **public**, so never type personal
details (your weight, name, API key) into any file.

---

## Part 1: Make your copy (one time, ~15 minutes)

You can do all of this on a computer, or in Safari on your phone. A computer is easier.

### 1. Create a GitHub account
1. Go to <https://github.com/signup> and sign up (free).
2. Pick your **username** carefully: it becomes part of your app's address
   (`username.github.io`). If you change it later, the address changes, and you'd need a backup
   to move your data.

### 2. Fork the repository
1. Sign in, then open <https://github.com/riddhipatil1218/Momentum>.
2. Near the top right, click **Fork**.
3. On the next page:
   - **Owner:** your username.
   - **Repository name:** whatever you like, e.g. `momentum` (it becomes the end of your address).
   - Leave **"Copy the main branch only"** ticked.
4. Click **Create fork**. After a few seconds you're looking at **your** copy
   (the top left says `your-username / momentum`, "forked from riddhipatil1218/Momentum").

### 3. Turn on publishing (GitHub Pages)
1. In your copy, click **Settings** (top menu of the repository, the gear icon).
2. In the left sidebar, click **Pages**.
3. Under **Build and deployment → Source**, choose **GitHub Actions**.

### 4. Allow the publishing robot to run
GitHub switches robots off in new forks, for safety.
1. Click the **Actions** tab.
2. You'll see a message like *"Workflows aren't being run on this forked repository."*
   Click **I understand my workflows, go ahead and enable them.**

### 5. Publish for the first time
1. Still in **Actions**, click **Test and publish Momentum** in the left list.
2. Click **Run workflow** (right side) → **Run workflow**.
3. Wait 1–2 minutes. A **green check** means it worked. A **red X** means something failed:
   click it to see which step (see *Troubleshooting* below).
4. Your address is shown in **Settings → Pages** ("Your site is live at …"). It looks like
   `https://your-username.github.io/momentum/`.

### 6. Put it on your iPhone
1. Open your address in **Safari** (it must be Safari).
2. Tap **Share** (square with an arrow) → **Add to Home Screen** → **Add**.
3. Open it from the new icon. The welcome screen asks for **your** stats and suggests
   **your** daily targets.

### 7. Turn on AI meal estimates (optional)
The Macros tab uses Claude to estimate meals. You need **your own** Anthropic API key.
Never use someone else's: it bills their account.
1. Go to <https://console.anthropic.com>, sign up, and add a little credit under **Billing**
   (a few dollars lasts a long time).
2. Optional but smart: set a monthly **spend limit** (Settings → Limits).
3. **API Keys → Create Key**, and copy it (it starts with `sk-ant-` and is shown only once).
4. In your app: **Settings → Anthropic API key**, paste it, and tap **Save key**.

> Were you already using the original link? Your data there doesn't move by itself.
> In the old app: **Settings → Back up now**. In your new app's welcome screen:
> **"New phone? Restore from a backup"**.

---

## Part 2: Customize it

### Level 1: Inside the app (no files to edit)
Most personal things are already settings:

| What | Where |
|---|---|
| Your stats, calorie and macro targets | **Settings** |
| Weekly workout goal | **Settings → Weekly workout goal** |
| Supplements (add, rename, reorder, remove) | **Press and hold** any supplement on Today |
| Workout types (name, emoji, what it tracks) | **Press and hold** any workout chip on Today |
| Restaurant and brand lookups on or off | **Settings → AI meal estimates** |
| Oura ring screenshots (measured calorie burn) | **Settings → Oura ring** (off unless you have one) |
| Light or dark | Follows your iPhone's setting |

### Level 2: Edit files on the GitHub website
No tools needed: GitHub has a built-in editor.

**How to edit any file:**
1. In your repository, click through the folders to the file (e.g. `app` → `css` → `styles.css`).
2. Click the **pencil icon** (Edit this file).
3. Make your change.
4. Click **Commit changes…** → write a short note like "Change colors" → **Commit changes**.
5. Watch the **Actions** tab: in about a minute you get a green check, and your site is updated.
   On your phone, close the app completely and reopen it.

**Things you can change:**

#### Colors
File: `app/css/styles.css`. At the top are color "tokens" (named colors) in three blocks:
the first is **light mode**, and the two after it (they say `dark`) are **dark mode**.
Change the hex codes (like `#6A1E55`) in all three blocks:

| Token | What it colors |
|---|---|
| `--accent` / `--accent-strong` | Buttons, today's date, links, the quote |
| `--workout` | Workout dots, week checkmarks, progress bars, deficits |
| `--supplement` | Supplement dots and checkmarks |
| `--mauve` | Extra color in stats, the quote's side line, the goal line |
| `--bg`, `--card`, `--fill` | Page background, cards, buttons and inputs |
| `--text`, `--text-2` | Main and secondary text |
| `--danger` | Over-target and delete |

Tip: keep text readable. Light text needs a dark background and the other way round.

#### The quotes
File: `app/js/logic/quotes.js`. Each line looks like:

```js
{ text: 'Beware; for I am fearless, and therefore powerful.', author: 'Mary Shelley', book: 'Frankenstein', edge: true },
```

You can add, remove or replace quotes. **The automatic tests check these rules, and the site
won't update if one is broken:**
- 140 characters or fewer, no emoji, no duplicates.
- Every quote has an `author` and a `book`.
- `edge: true` marks the darker, sharper ones. **Two `edge: true` quotes can't be next
  to each other**, and 40–60% of the list should have it.
- If a quote contains an apostrophe ('), use the curly one (’) or the line breaks.
  Copy one of the existing lines to be safe.

#### The app's name
Change `Momentum` in three places: `app/manifest.webmanifest` (`name` and `short_name`) and
`app/index.html` (the `<title>` line and the `apple-mobile-web-app-title` line).
The name under the Home Screen icon is set when you add the app. To change it, you'd
re-add the app (see the warning below).

#### The icon
Replace the files in `app/icons/` with your own square images, **using the same names**:
`icon-180.png`, `icon-192.png` and `icon-512.png` (those exact pixel sizes), plus `icon.svg`.
On GitHub: open the `app/icons` folder → **Add file → Upload files** → drag them in → commit.

> **Warning:** iPhone keeps the old icon until you remove the app from your Home Screen and
> add it again, and **removing it deletes the app's data**. Do **Settings → Back up now**
> first, then restore afterwards.

#### Starting lists (for a fresh install)
`app/js/logic/workouts.js` holds `DEFAULT_ACTIVITIES` (the first workout menu) and
`DEFAULT_SUPPLEMENTS` (the first supplement list). These only matter the **first** time the app
opens on a phone. After that, use press-and-hold in the app instead.

#### Greeting words
`app/js/ui/format.js`, the `greeting` function ("Good Morning" and so on). A test checks
these exact words in `tests/ordering.test.js`, so update that test file to match, or the site won't
update.

### Level 3: Bigger changes with Claude Code
For new features or redesigns, you can have Claude build them, as was done for the original:
1. Go to <https://claude.ai/code> (needs a paid Claude plan) and connect your GitHub account.
2. Start a session with **your** repository.
3. Describe what you want, like "add a water tracker to the Today tab".

The repository includes `CLAUDE.md` (rules for Claude: data safety, privacy, how to test) and
`SPEC.md` (every design decision so far), so Claude picks up where things left off.

**First thing to tell Claude in your copy:** *"Create my own prototype page and replace the
prototype link in CLAUDE.md with it."* The link in there belongs to the original owner and won't
open for you.

---

## Part 3: Keeping your copy healthy

### When something fails
- **Red X in Actions:** click it, then the failed step. **"test"** failing means a file change
  broke a rule (common causes: a quote rule, a typo in a file). Fix the file, or put the old version back:
  open the file → **History** → pick an earlier version → copy its text back in.
  **Your live app keeps working on the last good version in the meantime.**
- **Site shows "404":** check **Settings → Pages → Source** is **GitHub Actions**, then re-run
  the workflow (**Actions → Test and publish Momentum → Run workflow**).
- **Phone shows the old version:** close the app completely and reopen it, twice if needed.

### Getting improvements from the original
Your copy doesn't update by itself. When the original gets new features:
1. On your repository's main page, click **Sync fork → Update branch**.
2. If you edited the **same files** the original changed, GitHub may say there's a conflict and
   offer to **discard** your commits. Only accept if you're happy to redo your changes (save
   copies of your edited files first). Customizing only a few files (colors, quotes, icons)
   keeps syncing easy.

### Protect your data
- **Settings → Back up now** every few weeks. Save the file to Files or iCloud Drive.
- Deleting the Home Screen icon, or clearing Safari's website data, deletes the app's data.
- Don't publish other websites from the same GitHub account unless you trust them. Sites at
  `your-username.github.io/...` share an address, so in principle they could read the app's data.

### Privacy checklist
- Your repository is **public**: anyone can read the code. Never put your weight, name,
  email or API key in any file or commit message.
- Your entries stay on your phone. Meal descriptions and photos go only to Anthropic, for estimates.
- If your phone is lost, delete your API key at console.anthropic.com and make a new one.
