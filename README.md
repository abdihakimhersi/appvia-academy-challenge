# Appvia Academy graduate technical challenge

Welcome, and thank you for applying to the Appvia Academy!

This short technical challenge is the next step in our process. It reflects
the kind of work a Graduate Platform Engineer actually does: taking over
something you didn't write, working out why it doesn't behave, fixing it
carefully, finding out what went wrong in production, and explaining your
reasoning to others.

**You do not need any AWS, Terraform, Kubernetes or Docker experience.** We
teach those in the Academy. What we are looking for is problem-solving,
attention to detail, engineering judgement and clear communication.

---

## The scenario

You've just joined the platform team at Appvia and inherited **Taskboard**: a
small internal task tracker built by an engineer who has since left the
company.

The handover notes say:

> "It's a simple Node.js app. Users reported odd behaviour for a while, then
> one Friday afternoon every task disappeared, more than once, so we switched
> it off. It won't even install now. Ops kept the access log from that day.
> Good luck!"

Your job is to get Taskboard working, make it match its spec, and work out
what happened that Friday.

---

## What's in this pack

```
├── README.md          ← you are here
├── WRITEUP.md         ← template for your write-up (part of your submission)
├── app/               ← the Taskboard application (Node.js + Express)
└── logs/
    └── access.log     ← Taskboard's access log from the day it was switched off
```

You'll need **Node.js 18 or newer** ([nodejs.org](https://nodejs.org)).
Everything else is up to you. On Windows, run the commands in Git Bash or WSL:
Part 2 asks for a Bash script.

---

## Before you start: set up your repository

1. Create a **private** GitHub repository.
2. Make your **first commit the pack exactly as you received it**, before you
   change anything, and push it.
3. Invite these GitHub users as collaborators: `KashifSaadat`, `M-Hood`, `mrsheepuk`, `m13t`, `mike-guy`, `Amir-Tayabali`, `salmaniqbal`, `jay-withers`.
4. Commit and push as you go, with messages that say what you changed and
   why. We read your history to understand how you worked, so one commit at
   the end tells us much less. There is no "right" number of commits.

---

## Part 1: get it running and fix what you find

Get the application running locally, then use it and test it against the spec
below. There are **several deliberate faults**: some stop it installing or
starting, some break its behaviour, and some are security problems. We won't
tell you how many. Fix what you find.

To start the app:

```bash
cd app
npm install
npm start
```

### The spec the app is supposed to meet

Treat this as the source of truth:

- `npm install && npm start` works from a **clean clone of your repository**,
  with no environment variables and no local config file.
- The app listens on port **3000** by default. The `PORT` environment variable
  overrides it.
- `GET /` serves the web UI.
- `GET /health` returns `{"status":"ok"}`.
- `GET /api/settings` returns the settings the web UI needs, including
  `maxTextLength`. Anyone can call it, so it must contain nothing secret.
- `GET /api/todos` returns all todos as JSON, newest first.
- `POST /api/todos` with JSON body `{"text": "..."}` creates a todo and returns
  it with status `201`. Text that is missing, blank or not a string is rejected
  with status `400` (never a `500`). Text longer than `maxTextLength` is cut to
  that length, not rejected: the old mobile app relies on this.
- `PUT /api/todos/:id` toggles that todo's `completed` flag, both ways.
  Returns `404` if no todo has that id.
- `DELETE /api/todos/:id` deletes **the todo with that id**, returning `204`.
  Returns `404` if no todo has that id.
- `POST /api/admin/reset` deletes every todo. The operations team uses it
  between demos, so it stays. The admin token comes from the `ADMIN_TOKEN`
  environment variable and is sent in an `X-Admin-Token` header. Only a
  request carrying the correct token may reset the board; every other
  request is refused.
- Task text supports **bold**: text wrapped in `**double asterisks**` shows in
  bold in the web UI.
- The app must not expose secrets or internal configuration to users.

Both the API **and the web UI** should behave correctly. Try using the app the
way an ordinary (or a mischievous) user would.

### Tips

- Read error messages carefully. They usually tell you exactly what's wrong.
- `npm` may print useful warnings during install.
- Think like the security team: what would worry you about this code?

---

## Part 2: what happened on Friday

`logs/access.log` is Taskboard's access log from the day it was switched off.
Each line is one request, in the format the app's logger writes:

```
<address> - - [<timestamp>] "<METHOD> <path> <protocol>" <status> <bytes> "<referrer>" "<user agent>"
```

For example:

```
10.20.4.31 - - [14/Aug/2026:08:55:26 +0000] "GET /api/settings HTTP/1.1" 200 71 "http://taskboard.appvia.internal:3000/" "Mozilla/5.0 (X11; Linux x86_64) ..."
```

### 2a. A small reporting script

Write a program that takes a **path prefix** and a **path to a log file**, and
prints how many requests each client address made to paths starting with that
prefix.

**Requirements:**

- Include an executable script named exactly **`report.sh`** at the root of
  your repository. It may be pure Bash, or it may call a program you wrote in
  any language you like (Python, JavaScript, Go, ...).
- It must run as: `./report.sh <path-prefix> <path-to-log-file>`
- A request matches when its path (the second part of the quoted request
  line) starts with the prefix. Matching is case-sensitive. Text in the
  referrer or user agent does not count.
- Output: one line per address in the form `<address>: <count>`, sorted by
  count **descending**. Break ties by comparing the addresses as plain text,
  character by character.
- Only include addresses with at least one match. If nothing matches, print
  nothing and exit successfully.
- Ignore blank lines and lines that don't match the format.

**Check yourself:** running `./report.sh /style.css logs/access.log` against
the provided file should print exactly:

```
10.20.4.11: 5
10.20.4.15: 5
10.20.4.23: 5
10.20.4.31: 4
10.20.4.12: 3
```

We will also run your script against log files you haven't seen, so make sure
it follows the rules above rather than the contents of this file.

### 2b. The investigation

Use your script, and anything else you like, to work out what happened that
Friday. In your write-up, tell us:

- what happened, in order, with times from the log;
- how it was possible, and which of the faults you found played a part;
- whether everything users complained about that day had the same cause;
- what should happen now, beyond deploying your fixed code;
- a short summary for Taskboard's owner, who isn't technical.

---

## Part 3: three improvements

In your write-up, tell us the **top three** things you would improve before
you would trust Taskboard in production, and why those three, in that order.

Exactly three. Part of the exercise is deciding what matters most.

**Optional:** if you have time, build one of your three improvements, or a
meaningful part of it. Depth and reasoning count for more than size, and an
unfinished build with a clear explanation of where you got to still earns
credit. Whatever you add, `npm install && npm start` from a clean clone must
still work. If your build needs anything extra, document it in your write-up
and keep a sensible fallback.

---

## Part 4: the write-up

Complete **`WRITEUP.md`** (there's a template ready for you). It covers what was
broken and how you found it, the investigation, your three improvements, how
you worked, and what you'd do next.

---

## How you work

Use whatever you would normally use at work: documentation, search engines,
tools. Whatever you use, you must be able to explain every change in your own
words, without notes. If we take your application forward, someone from our
team will ask you to on a short call, and again at the Assessment Day.

We'd rather see four faults you understand properly than ten you can't
explain. An honest account of what you didn't finish earns credit. A claim
that your repository doesn't back up loses it.

---

## Time, deadline and submission

- **Expected effort:** roughly 3 hours for Parts 1 to 4. Please don't spend
  more than about 5 hours in total, including the optional build. This is not
  a test of endurance.
- **Deadline:** 5 days from receiving this challenge. The exact date and time
  are in the email we sent you. We assess what is on your repository's
  default branch at the deadline; later commits are not considered.

**How to submit:**

1. Push everything to your repository's default branch.
2. Check you have invited the collaborators above. Invitations show as
   pending until we accept them, which is fine.
3. Complete the submission form: https://docs.google.com/forms/d/e/1FAIpQLSfEK3m4ivzDSEqWVPns92mzyWt5IqdBSHtv5aC0FFOaD0FNww/viewform. It asks for your
   name, email, GitHub username and repository link. No attachments needed.

Your repository should contain the fixed `app/`, your `report.sh` (plus any
supporting files) and your completed `WRITEUP.md`, all at the top level rather
than inside another folder.

---

## Questions

If anything is unclear, or broken in a way that seems unintended, email us at
`tech-test-submissions@appvia.io`. Asking a good question is never held against you.

Good luck, and we look forward to reading your work!

*The Appvia Academy team*
