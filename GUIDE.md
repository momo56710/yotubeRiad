# YouTuber Finder: the guide

Find YouTubers in any niche, see how to contact them, and use Claude to write the outreach. No coding needed.

**Contents:** [0 Build](#0-build-the-app-once) · [1 Start](#1-start-the-app) · [2 API key](#2-get-your-free-api-key-one-time) · [3 Search](#3-search-for-channels) · [4 Results](#4-reading-the-results) · [5 Track](#5-track-who-you-contacted) · [6 Limits](#6-daily-limits) · [7 Claude](#7-using-it-with-claude) · [8 Problems](#8-if-something-goes-wrong) · [9 Etiquette](#9-outreach-etiquette)

---

## 0. Build the app (once)

You received a folder with the app's source code. You turn it into a program you can double-click. This takes about two minutes and you only do it once.

**Windows**

1. Put the whole folder somewhere permanent, for example `Documents\YouTuber Finder`. (Don't run it from inside the zip file. Right-click the zip and choose **Extract All** first.)
2. Double-click **`build.bat`**.
3. The first time, it installs a small free tool called **Deno** (Windows may ask permission). When it finishes it says to **close the window and double-click `build.bat` again**. Do that.
4. Wait for **"Done!"**. A file called **`YouTuberFinder.exe`** now appears in the same folder.

> If Windows says the install didn't work (very old Windows, or no "winget"), install Deno yourself: open the [Deno install page](https://deno.com), follow the Windows instructions, then double-click `build.bat` again.

**Mac or Linux**

1. Install Deno: `curl -fsSL https://deno.land/install.sh | sh` (then close and reopen the terminal).
2. In a terminal inside the folder, run `./build.sh`. You get a program called `YouTuberFinder`.

**Easiest way: ask Claude.** Open Claude in this folder and say: *"Please build the YouTuber Finder app for me."* It reads `CLAUDE.md` and runs the steps above for you.

**If you already have Node.js** you can skip building and run it directly with `node yt.js` in the folder, then open `http://localhost:3550`.

**If you change anything** (you won't need to), run the build again to get a fresh program. Your saved list (the `data` folder) and API key are kept.

---

## 1. Start the app

1. **Keep `YouTuberFinder.exe` in this folder** (the one with `build.bat`). The app saves your list in a `data` folder next to it, so don't move the exe on its own.
2. **Double-click it.** A black window opens and your web browser opens the app. Leave the black window open while you work.
3. **To stop the app**, close the black window.

> **Windows says "Windows protected your PC"?** That is normal for any new program that isn't from a big publisher. Click **More info**, then **Run anyway**. If Windows Firewall asks for permission, click **Allow**.

> The browser didn't open by itself? Open your browser and go to `http://localhost:3550`.

## 2. Get your free API key (one time)

The app uses Google's free YouTube service to look up channels. That needs a personal "API key", which is like a password for the app. It is free and does not need a credit card. The app asks for it the first time you open it, and you can change it any time with the **API key** button at the top right.

1. Go to [console.cloud.google.com](https://console.cloud.google.com/projectcreate), sign in with a Google account, and create a project (any name).
2. Open the [YouTube Data API v3 page](https://console.cloud.google.com/apis/library/youtube.googleapis.com) and click **Enable**.
3. Go to [Credentials](https://console.cloud.google.com/apis/credentials), click **Create credentials**, then **API key**.
4. Copy the key (it starts with `AIza`). Paste it into the app's key box and press **Save key**. The app checks it with Google first. A green dot appears next to "API key" when it works.

> **Keep your key private.** Don't post it online, and don't paste it into a chat with Claude or anyone else. Anyone who has it can use up your daily allowance.

## 3. Search for channels

1. **Type what you're looking for** in the big search box, for example *vegan recipes*, *indie game reviews* or *home workouts*. Be specific: "budget travel vlog" finds better matches than "travel".
2. **Choose filters** if you want them: country, language and channel size. **Small (10K to 100K)** is a sweet spot for outreach. These creators are big enough to matter and still answer their email. The optional **Label** lets you tag a batch (for example "gaming") so you can filter by it later.
3. **Press Search.** It takes up to a minute or two. You get at least 60 channels.
4. **Press Find more** to add about 50 more from the same search. Repeat until the button says "No more to find".

**To get a bigger list:** run several related searches (for example "minecraft survival", "minecraft speedrun", "minecraft mods") instead of one broad one. Each finds different channels. Try "Any size" first to see how many exist, then narrow down.

When you open the app it starts empty. Your earlier results are not lost. Press **Saved** above the results to see everything you've ever found.

## 4. Reading the results

Each channel is a card. Switch to a table with the buttons at the top right of the results if you prefer rows.

| On the card | What it means |
|---|---|
| Subscribers, Views, Videos | The size of the channel. YouTube rounds subscriber counts. Some channels hide theirs and don't appear in size-filtered searches. |
| **Green "Active" badge** | Posted in the last 30 days. Amber means within about 4 months. Grey means older, so they may not answer. |
| Email | Shown only if the creator put it in their channel description. Click it to open your mail app, or use the copy button. Many channels have none. |
| @handle on X | Their X (Twitter) account, if they listed it. Useful for a friendly first contact or when there's no email. |
| Link chips | Websites and socials found in the description (Instagram, Discord, Patreon, Linktree...). |

> YouTube also lets creators put a business email on the channel's **About** tab, behind a "View email address" button. Google's service doesn't share it, so the app can't show it. For channels with no email on the card, click **Open channel**, then the About tab.

**Sorting and filtering.** Above the results you can type to filter, pick a label or status, tick **Has email** or **Has X** to see only reachable creators, and sort by subscribers, recent activity, views or name.

**Getting your list out.**
- **Copy emails** copies every email in the current view.
- **CSV** downloads the whole list as a spreadsheet file for Excel or Google Sheets.

## 5. Track who you contacted

Every card has a status dropdown: **New**, **Contacted**, **Replied** or **Skip**. Change it as you go. It saves automatically, and you can filter by status so you never email the same person twice.

## 6. Daily limits

Google gives each key **10,000 units a day**. The meter at the top of the app shows how much you've used. A Search or a Find more costs roughly 1,000 to 1,500 units, so expect **6 to 8 big searches a day**. When it runs out, the app tells you. Everything you already found is kept, and the allowance resets the next day (midnight Pacific time, about 3 am Eastern).

---

## 7. Using it with Claude

The app finds the creators. **Claude** is great at the next step: deciding who's the best fit and writing emails that don't sound like a template. You don't need to code anything.

This folder includes a file called **`CLAUDE.md`**. It tells Claude what this app is, where your list is saved, and how to help you safely. Claude reads it automatically when you open it in this folder, so you don't have to explain the app each time.

### Option A (best): open Claude in this folder

Use this if you have **Claude Code** (in a terminal or in VS Code) or the Claude desktop app with access to a folder.

1. Open Claude **in the folder that contains `YouTuberFinder.exe`**.
2. Claude reads `CLAUDE.md` and can read your saved list directly from `data/channels.json`. No attaching or exporting needed.
3. Just ask in plain English, for example: *"Pick the 15 best creators for my product and draft emails."*

### Option B: Claude on claude.ai (chat)

1. In the app, filter the list to what you want (for example **Has email**) and click **CSV**. It downloads `youtubers.csv`.
2. Open [claude.ai](https://claude.ai), start a new chat, and **attach the CSV** with the paperclip or "+" button.
3. Paste one of the prompts below and fill in the [brackets] about your business.

The CSV only has public information from YouTube. It never contains your API key.

### Prompts to copy

**1. Pick the best creators**

> I run [your business / product, in one or two sentences]. Using my list of YouTube creators, pick the 15 best fits for [what you want from them: a sponsored video, a review, an affiliate partnership, a collab]. Prefer creators who have an email, posted recently (check lastUpload), and whose description matches my audience. Give me a table with: name, subscribers, why they're a good fit (one line), and their email. Mention anyone who looks like a bad fit.

**2. Write the first emails**

> For each of the creators you picked, write a short first email (under 120 words) from me. About me: [your name, business, one line on what you do]. What I'm offering: [the specific proposal]. Rules: mention one specific thing from each creator's own channel description so it's clearly not a mass email, no flattery clichés like "I love your content", one clear question at the end, and a polite line at the bottom saying they can tell me if they'd rather not hear from me. Give me a table with: creator name, email address, subject line, email body.

**3. Follow-ups**

> Write a short, friendly follow-up (under 60 words) for creators who haven't replied after 5 days. It should add one new useful detail instead of just saying "following up". Then write a final follow-up for 10 days later that makes it easy to say no.

**4. Sort the list into groups**

> Split the creators in my list into groups by what they actually make (use their description and label). For each group, tell me how many there are and which angle I should use when I reach out. Flag any channels that look inactive, are mostly in a language I don't write in, or don't look like real creators (for example auto-generated "Topic" channels).

**5. Reply to a creator who answered**

> A creator replied to my outreach. Here's their message: [paste it]. My goal is [what you want]. Draft a short, friendly reply that answers their questions and moves us one step forward. If they asked about rates or terms, give me two options for how to respond and tell me what to watch out for.

### Tips for better results

- **Tell Claude about your business first.** The more specific you are, the less generic the emails sound.
- **Do small batches.** Ask for 5 emails, read them, tell Claude what to change ("shorter", "more casual", "mention my free trial"), then ask for the rest.
- **Claude drafts, you send.** If your Claude has Gmail connected, you can ask it to create *drafts* so you only press Send. Read each one first.
- **Mark who you contacted** in the app (status dropdown) so you and Claude both know who's left.

### Using Claude to fix problems with the app

If the app shows an error you don't understand, copy the message (or take a screenshot) and give it to Claude:

> I'm using a Windows program called YouTuber Finder. It looks up YouTube channels using a free YouTube API key from Google. I'm not technical. I got this message: [paste the error or attach a screenshot]. What does it mean, and what should I do, step by step?

> **Never paste your API key into a chat.** If an error message contains your key, replace it with "XXXX" first. When Claude works in this folder, it is told not to open the key file.

---

## 8. If something goes wrong

| What you see | What to do |
|---|---|
| "Windows protected your PC" | Click **More info**, then **Run anyway**. It's normal for new programs. |
| The browser doesn't open | Go to `http://localhost:3550` in your browser. Make sure the black window is still open. |
| The page can't connect | The black window was closed. Double-click `YouTuberFinder.exe` again. |
| "Google rejected this key" | The key was copied incompletely or not enabled for YouTube. Copy it again, and check you pressed **Enable** on the YouTube Data API v3 page. |
| "Daily allowance is used up" | Wait until tomorrow (resets at midnight Pacific time). Your results are saved. Meanwhile, work with what you've already found. |
| A search finds very few channels | Your size range may be too narrow. Try "Any size", a broader topic, or related searches. |
| "Already running" | The app is already open in another black window. Use that one. |
| Antivirus blocks the file | The app is unsigned, so some antivirus programs flag it. Allow it for that folder. |
| I moved or deleted the folder | The list lives in the `data` folder next to the program. Keep them together, and copy the whole folder if you move computers. |

## 9. Outreach etiquette

- **Be honest about who you are** in every email: real name, real business, a real reply address.
- **Give a way to opt out** and respect it right away. Mark those creators **Skip** in the app. Laws like CAN-SPAM (US) and GDPR (EU) expect this, and creators remember who was polite.
- **Personalize.** One specific detail about their channel makes the difference between a reply and the spam folder.
- **Send in small batches** (a few dozen a day from your own email), not hundreds at once.
- **One or two follow-ups is enough.** After that, move on.
- **Be upfront about money.** If it's paid, say so. If it's a free product, say what it's worth.
