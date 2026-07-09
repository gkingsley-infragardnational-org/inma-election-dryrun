# Deploying the Election Dry Run — No Terminal Required

Good news: you do **not** need to run Wrangler or open Terminal at all. This app needs real server-side code (Pages Functions), and Cloudflare's plain drag-and-drop upload doesn't support that — but connecting a GitHub repo to Cloudflare Pages does, and that whole path is point-and-click.

Every step below is something you click, type, or paste. Whenever what's on your screen doesn't match what I describe, take a screenshot and paste it right into our chat — I'll tell you exactly where to click next.

---

## Part A — Put the code where Cloudflare can see it (GitHub)

1. Go to **github.com** in your browser.
2. If you already have an account, log in. If you don't, click **Sign up** (top right), and follow the prompts — it's free and takes about 2 minutes.
3. Once logged in, click the **+** icon in the top-right corner, then click **New repository**.
4. Under "Repository name," type: `inma-election-dryrun`
5. Leave everything else as-is. Click the green **Create repository** button.
6. On the next page, look for a link/button that says **uploading an existing file** (it's usually a small blue link in the middle of the page). Click it.
   - If you don't see that link, click **Add file** (top right of the file list) → **Upload files**.
7. Now open Finder on your Mac and find this folder: **`election-test-app`** (the one I gave you). Open it so you can see the files and folders inside (`functions`, `public`, `seed`, `wrangler.toml`, `README.md`, `DEPLOY_GUIDE.md`, `package.json`).
8. Select everything inside that folder **except** `node_modules` (if it's there) and drag all the selected files/folders onto the GitHub upload page in your browser.
9. Wait for the upload progress bars to finish, then scroll down and click the green **Commit changes** button.

You now have your code on GitHub. Leave that browser tab open or come back to it later — you won't need to touch GitHub again after this.

---

## Part B — Connect Cloudflare Pages to that GitHub repo

You said you're already looking at the Workers & Pages screen in Cloudflare — good, start there.

1. Click **Create application** (or **Create**, depending on what you see) — button is usually top-right.
2. Choose **Pages** as the type, then **Connect to Git**.
3. If asked, click **Connect GitHub** and authorize Cloudflare to access your GitHub account (a popup will ask you to approve this — click **Authorize**).
4. Select the repository you just created: **inma-election-dryrun**. Click **Begin setup** (or **Continue**).
5. On the "Set up builds" screen, fill in exactly this:
   - **Project name:** leave as suggested, or type `inma-election-dryrun`
   - **Production branch:** leave as `main`
   - **Framework preset:** choose **None**
   - **Build command:** leave **completely blank**
   - **Build output directory:** type `public`
6. Click **Save and Deploy**.
7. Wait a minute or two while it builds. When it's done, you'll see a link like `https://inma-election-dryrun.pages.dev` — that's your site's address. It will load, but voting won't work correctly yet — that's expected, because we haven't connected the storage or admin password yet. Keep going.

---

## Part C — Create the storage "bucket" for votes (KV) and add the 5 test voters

1. In the Cloudflare dashboard, look at the left sidebar for **Workers & Pages**, and under it (or nearby) a link called **KV**. Click it.
2. Click **Create a namespace** (or **Create namespace**).
3. Name it: `inma-election-votes` and click **Add** / **Create**.
4. You'll now see it in the list. Click on it to open it.
5. Look for a button like **Add entry** or **Add a key-value pair**. Click it.
6. You'll add 5 entries, one at a time. For each one, there's a **Key** box and a **Value** box. Copy-paste exactly from the list below (see `kv-entries-to-paste.txt` in your folder — it has all 5 ready to copy). After pasting each Key and Value, click **Save** / **Add**, then repeat for the next one.

(Full copy-paste values are in **`kv-entries-to-paste.txt`** next to this guide — open that file, copy each Key and Value pair exactly as shown.)

These 5 entries are your **synthetic test voters** — fake IDs and PINs, nothing real. Their PINs are: `voter-001`→`1234`, `voter-002`→`2345`, `voter-003`→`3456`, `voter-004`→`4567`, `voter-005`→`5678`.

---

## Part D — Connect the storage bucket and set the admin password

1. Go back to **Workers & Pages**, click your project (**inma-election-dryrun**).
2. Click the **Settings** tab.
3. Find **Bindings** (sometimes called "Functions" → "KV namespace bindings"). Click **Add** (or **Add binding**).
4. Choose type **KV namespace**.
   - **Variable name:** type exactly `VOTES` (all capital letters)
   - **KV namespace:** choose `inma-election-votes` (the one you just made)
5. Click **Save**.
6. Still in **Settings**, find **Variables and Secrets** (this may also be labeled "Environment Variables").
7. Click **Add variable** (or **Add**).
   - **Variable name:** type exactly `ADMIN_KEY`
   - **Value:** make up a password only you (and whoever else should see results) will know — write it down somewhere safe.
   - Make sure it's marked as **Secret** / **Encrypt** (there's usually a toggle or a separate "Encrypt" button — use it so the value is hidden after saving).
8. Click **Save**.

---

## Part E — Redeploy and test

Bindings only take effect on a fresh deployment.

1. Click the **Deployments** tab for your project.
2. Find the most recent deployment, click the **⋯** (three dots) next to it, and choose **Retry deployment** (or click a **Redeploy** button if you see one).
3. Wait for it to finish (green checkmark / "Success").
4. Visit your site: `https://inma-election-dryrun.pages.dev`
   - Enter Voter ID `voter-001`, PIN `1234`, pick a candidate, submit. You should see "Ballot recorded."
5. Visit `https://inma-election-dryrun.pages.dev/admin`
   - Enter the `ADMIN_KEY` password you set in Part D, click **Load results**.
   - You should see the tally, including the vote you just cast.

If step 4 or 5 doesn't work as described, screenshot whatever you see and send it to me — that'll tell me exactly what's misconfigured.

---

## Once this works

To really prove it's not tied to one device: cast a test vote from your phone (on cellular data, not your home WiFi) using a different voter ID, then check `/admin` from your desktop and confirm that vote shows up in the tally too.
