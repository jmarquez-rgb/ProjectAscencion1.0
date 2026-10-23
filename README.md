# Project Ascencion 2.0

A phone-friendly training, recovery and fuel tracker. It is a plain static website (no build step, no server), so it runs free on GitHub Pages.

**Your data stays on your device.** Everything is saved in your browser's local storage. There is no account and **no cloud sync**. Use Data > Export backup often.

---

## What is in this folder

| File | What it does |
| --- | --- |
| `index.html` | The page shell |
| `style.css` | The dark, mobile-first design |
| `app.js` | All the logic: training engine, logging, fuel, backups |
| `manifest.webmanifest` | Lets you add the app to your iPhone Home Screen |
| `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | App icons |
| `README.md` | This guide |

All files must sit at the **root** of the repository (not inside a sub-folder).

---

## Put it on GitHub Pages (beginner steps)

1. Unzip `Project_Ascencion_2_0_GitHub_App.zip` on your computer. You should see `index.html` directly inside the unzipped folder.
2. Sign in at github.com and click **New** (new repository).
3. Name it exactly `project-ascencion`. Choose **Public** (free Pages needs public unless you have a paid plan). Click **Create repository**.
4. Click **uploading an existing file**. Drag in **the files from inside the unzipped folder** (select them all, not the folder). Wait for the upload bar to finish.
5. Type a short message like `first upload`, make sure **Commit directly to the main branch** is selected, and click **Commit changes**.
6. Open **Settings** > **Pages**.
7. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
8. Set **Branch** to `main` and the folder to `/ (root)`. Click **Save**.
9. Wait one to three minutes, then open:

   **https://jmarquez-rgb.github.io/project-ascencion/**

   (The address is `your-username.github.io/project-ascencion/`. Note the dot between `jmarquez-rgb` and `github.io`.)

If you see a 404, wait a minute and refresh. If it persists, check that `index.html` is at the top level of the repo and that Pages shows "Your site is live".

### Add it to your iPhone Home Screen

1. Open the address above in **Safari** (not Chrome).
2. Tap the **Share** button (square with an arrow).
3. Scroll and tap **Add to Home Screen**, then **Add**.
4. Open it from the new icon. It runs full screen like an app.

> Important: the Home Screen app and Safari keep **separate** storage on iOS. Pick one place to log from. If you add it to the Home Screen after already logging in Safari, export a backup in Safari and import it in the Home Screen app.

---

## Using the app

- **Today**: the recommended session, muscle readiness, morning cardio, fuel snapshot and body snapshot. Start with the **recovery check-in** (sleep, fatigue, soreness, pain).
- **Train**: planned exercises with sets, rep ranges, RPE and tempo targets. Tap **Start workout**, then log load, reps and RPE for each set and tap the check mark. A rest timer starts automatically. **Finish and save** stores it. Use **Swap** to change an exercise, **Add exercise** for anything else, and **Edit** from Progress > History to fix a past workout.
- **Fuel**: log meals from your food library, track calories, protein, carbs, fat and water by day. Edit or add foods in the **Food library** tab.
- **Body**: log weight, waist and other measurements; view charts; see recovery check-in history; edit your historical references and targets.
- **Progress**: strength charts per exercise (estimated 1RM and top load), workout history and weekly sets per muscle.
- **Data**: export and import backups, settings (training days, nutrition targets, avoid list), reset.

### Starting references (editable)

The app ships with the reference points you gave: **270 lb on May 20, 2026**, **258.9 lb on Aug 30, 2026** and **waist 41.25 in on Aug 30, 2026**, plus a **255 lb checkpoint** and a **235-245 lb** longer-term goal. They are labelled as history, can be edited under Body > References, and are **never treated as today's reading**. Progress-to-goal numbers only appear after you log a real weigh-in.

### Foods

The library includes steak, chicken, turkey, eggs, sweet potato, jasmine rice, black beans, mixed vegetables, Kodiak pancakes, a protein shake and olive oil. The macros are **starter estimates**; check your labels and edit them. Default quick meals avoid onions, salsa, tomatoes, jalapeños and bell peppers. You can change that avoid list in Data > Settings. If you add or log a food that matches it, you get a gentle tag, not a block.

---

## How the training logic works

**Style.** Sessions blend two ideas: precise muscle targeting (a primary movement plus an angle variation, controlled 3-second lowering, form cues) and selected high-intensity sets (one hard set, low volume) with plenty of recovery. This is *inspired by* publicly discussed training principles. It is not affiliated with or endorsed by any coach or athlete.

**What picks the next session.** For each muscle group the app scores readiness (0-100) from:

- time since you last trained it (about 72 hours for large muscles, 48 for small ones),
- soreness (0-3) and pain (0-5, mapped to the muscles an area affects),
- last night's sleep and today's fatigue,
- recent strength trend (a drop in estimated 1RM lowers readiness),
- your weekly set count versus a starting target, and how many of your available training days are left.

It then recommends the best session type (Push, Pull, Legs, Quads and calves, Hamstrings and glutes, Chest and back, Shoulders and arms), or a **recovery day** if recovery is low. A check-in older than a day (soreness and pain: three days) is ignored.

**Manual override.** Tap **Change session** to pick another session type, pick your own muscles, force a recovery day, or keep the day conservative. Overrides apply to today only. Safety rules still apply.

**Safe, conservative progression.**

- Loads are only suggested from sets **you logged**. With no history, the app asks you to pick a load and log a baseline; it never invents a starting weight.
- Machines and isolation lifts: add weight (one small step) only after every set at your top load reached the top of the rep range at **RPE 8 or lower**.
- Heavy compounds (leg press, squats, deadlift-style lifts, hip thrusts, barbell presses and rows): you must do that **in two sessions in a row** before adding weight.
- Missing RPE, RPE 9 or higher, a strength dip, low sleep or high fatigue, or pain 2 or higher: **hold** the load.
- Reps below the range, or RPE 9.5+ on a heavy lift: the app suggests about **5% less**.
- **No automatic failure prescriptions for heavy compounds.** Heavy lifts are capped at RPE 7-8 with 2+ reps in reserve.
- "Intensity sets" (one working set at RPE 9-9.5, no forced reps) are only used on machine or isolation exercises, at most two per session, only on a normal-load day, and only for muscles with no pain and low soreness.
- Pain 4/5 or higher in an area blocks the muscles it affects from automatic suggestions, and the app suggests getting it checked.

The readiness scores and progression rules are simple, transparent heuristics. They are a tracking aid, **not medical advice**. Stop any movement that causes sharp or worsening pain and talk to a qualified professional.

---

## Backups (please do this)

- **Data > Export backup (JSON)** downloads a file. Keep it somewhere safe (iCloud Drive, email it to yourself).
- On iPhone, **Share or save to Files** may be easier. **Copy JSON** is a fallback.
- **Import backup** lets you **merge** (adds what is missing) or **replace everything**. A safety copy of your current data is saved first.
- The app reminds you if you have not backed up in 7 days.
- Clearing Safari website data, deleting the Home Screen app, or iOS removing unused website data can erase your log. A backup file is the only protection.

---

## Not built yet (honest list)

- **No cloud sync and no multi-device support.** Data is per browser, per device.
- **No offline caching.** There is no service worker, so the app needs a connection to load. Your saved data is local either way.
- No notifications or reminders.
- Built-in exercises cannot be edited or deleted. You can add custom exercises, but cannot yet edit or delete them afterwards (hide them by simply not using them).
- Quick meals can be saved and deleted but not renamed.
- Charts are simple canvas charts without zoom or tap-for-value.
- Tested in headless Chromium at a phone-sized screen. It has **not** been tested on a physical iPhone or in Safari, so file download and Share behaviour on iOS should be tried once before you rely on them.

---

## Future idea: secure cloud sync with Supabase

Not implemented. If you want multi-device sync later, a safe design would be:

1. Create a Supabase project and enable **Email (magic link) sign-in**.
2. Create tables such as `workouts`, `meals`, `measurements`, `checkins` with a `user_id uuid references auth.users` column.
3. Turn on **Row Level Security** with a policy like `user_id = auth.uid()` for select, insert, update and delete, so each person can only reach their own rows.
4. In the app, use only the **public anon key** and the project URL. **Never put the `service_role` key in this repo or in any browser code.**
5. Keep localStorage as the offline copy, and sync changes in the background. Resolve conflicts by `updated_at`.
6. Keep JSON export as an independent backup.

Until that exists, nothing leaves your device.
