# Write-up: [Abdi-Hakim Hersi]

> Fill in each section below. Bullet points are fine. Clarity beats length.
> If we take your application forward, you'll talk someone from our team
> through this document, so write it as something you could explain without
> notes.

## 1. Getting started

The first error you hit, copied exactly as it appeared:

```
(npm error code EJSONPARSE
npm error JSON.parse Invalid package.json: JSONParseError: Expected double-quoted property name in JSON at position 297 (line 14 column 3) while parsing near "...rgan\": \"^1.10.0\",\n  }\n}\n"
npm error JSON.parse Failed to parse JSON data.
npm error JSON.parse Note: package.json must be actual JSON, not just JavaScript.
npm error A complete log of this run can be found in: C:\Users\SuperUser\AppData\Local\npm-cache\_logs\2026-10-04T12_39_39_219Z-debug-0.log
)
```

What you did about it:
- npm install had failed because EJSONPARSE
- the error pointed to Line 14 column 3 in package.json
- found that in the last line inside dependencies, there was a comma at the	even though there was no other item after the comma
- deleted the trailing comma and saved the file
- ran npm install and it worked but also reported "1 high severity 	vulnerability"
## 2. What was broken

For each fault you found: where it was, what the symptom was, how you found
it (what you ran or tried, and what you saw), the root cause, and what you
changed.

| # | Where (file) | Symptom | How I found it | Root cause | My fix |
|---|--------------|---------|----------------|------------|--------|
| 1 | `app/package.json` | `npm install` failed with `EJSONPARSE` | Ran `npm install`; the error pointed to line 14, column 3 of `package.json` | Trailing comma after the last dependency (`morgan`). JSON doesn't allow trailing commas, so npm couldn't read the file | Removed the trailing comma; `npm install` then worked |
| 2 | `app/package.json` | `npm install` warned of 1 high severity vulnerability | Ran `npm audit` and `npm ls moment` | `moment` pinned to exactly `2.29.1`, which has known path traversal and ReDoS vulnerabilities (fixed in 2.29.2 / 2.29.4) | Changed to `^2.30.1` to raise the minimum safe version; npm installed 2.31.0 and `npm audit` reports 0 vulnerabilities |
| 3 | `app/server.js` (line 7) | `npm start` crashed: `Cannot find module './config.json'` | Read the error (server.js line 7), ran `ls` (only `config.example.json` exists), read `.gitignore` | Code required `config.json`, but `.gitignore` keeps it out of the repo, so a clean clone can never start | Replaced the `require` with an empty object `{}`; every setting already falls back to a default (see section 5) |
| 4 | `app/server.js` (last lines) | `PORT=4000 npm start` printed port 4000 but the app only loaded on 3000 | Ran with `PORT=4000`, tried both addresses in the browser, compared the `PORT` line with `app.listen` | `app.listen(3000, ...)` was hard-coded, so the `PORT` variable was calculated but never used | Changed to `app.listen(PORT, ...)`; tested with and without `PORT=4000` || 5 | `app/server.js` (`settings` object) | `GET /api/settings` returned the admin token (and app version) to anyone | Ran with `ADMIN_TOKEN=supersecret`, opened `/api/settings`, saw the token in the response | The token was put in the public settings object even though the web UI never uses it | Removed `adminToken` and `version` so settings only contains `maxTextLength`; retested |
| 6 | `app/server.js` (admin reset route) | With no `ADMIN_TOKEN` set, a request with no header could wipe the board | Read the check `header !== ADMIN_TOKEN`: with both `undefined`, `undefined !== undefined` is false, so the request was allowed | The check didn't handle the case where no token is configured | Added `!ADMIN_TOKEN ||` so reset is refused when no token is set (fail closed); tested no header, wrong and correct token with curl || 7 | `app/server.js` (delete route) | Deleting an id that doesn't exist returned 204 and deleted the newest todo instead | `curl -X DELETE /api/todos/999` returned 204, and todo 3 disappeared from the list | `findIndex` returns -1 when nothing matches, and `splice(-1, 1)` removes the last item in the array | Return 404 when the index is -1; tested delete 999 -> 404, delete 1 -> 204, delete 1 again -> 404 || 9 | `app/server.js` (POST /api/todos) | `{"text":42}` crashed with a 500 and an HTML stack trace; `{"text":"   "}` created a blank todo | Sent bad input with curl: number -> 500, spaces -> 201 with empty text | The check `!req.body.text` only tested "truthy": 42 passes and then `.trim()` fails on a number; "   " passes and trims to "" | Reject anything that isn't a non-empty string: `typeof text !== 'string' \|\| text.trim() === ''` -> 400; tested number, spaces and missing -> 400, normal text -> 201 || 10 | `app/server.js` | Errors returned an HTML page with the full stack trace and server file paths; every response had `X-Powered-By: Express` | The 500 from `{"text":42}` showed `C:\Users\...` paths in the response; the Friday log has 1187-byte 500s | No error handler, so Express used its default error page, which includes the stack trace | Added a JSON error handler (details logged on the server, generic message to the user) and `app.disable('x-powered-by')`; tested malformed JSON -> 400 `{"error":"Bad request"}` |
## 3. What I didn't fix| 11 | `app/public/app.js` | A task containing HTML (e.g. `<img src=x onerror=...>`) ran script in the browser of everyone viewing the board | Added that task in the web UI and an alert popup appeared | `format()` turned task text into an HTML string and set it with `innerHTML`, so the browser parsed and ran it | Replaced it with `renderFormatted()`, which builds `<strong>` elements and inserts all text with `textContent`/`append`, so it's never parsed as HTML; retested: no popup, bold still works

Anything you found but didn't fix, or suspected but couldn't pin down, and
why. Leave this blank if there's nothing.
## 3. What I didn't fix
- **Double-click on buttons:** clicking Delete/Done twice quickly sends two
  requests. With fault 7 fixed, the second DELETE now safely returns 404,
  but the UI could disable the button while a request is in flight.
- **"Done" button label:** it always says "Done", even on completed todos.
- **Long unbroken text** (e.g. a long URL) overflows the task card.
- **Sort order:** todos created in the same millisecond can appear in either
  order.
- **No user login:** by the spec, anyone who can reach the app can add,
  toggle or delete any todo. Fine only if the app is internal.
- **Data only in memory:** a restart loses every todo (see improvement 2).
- **`config.example.json`** is now unused after fault 3's fix; I left it in
  the repo, and it still contains the old example token in git history.
## 4. Security

Which of the problems were security problems? For each one, what could
someone actually do with it?
an attacker could send a date sting that makes the old version of moment take a very long time to process. because the Node.js handles request one at a time, the whole app would freeze and it would cause a denial of service of attack.

- Admin token exposed in `/api/settings` (fault 5)
  - `/api/settings` is public, and it returned the admin token to
    anyone who opened it, with no login needed.
  - With that token, anyone could call `POST /api/admin/reset` and
    delete every task on the board, as many times as they liked.
  - It also exposed the app version, which tells an attacker exactly
    which version's known bugs to look up.

- Admin reset allowed when no token is configured (fault 6)
  - If the server was started without `ADMIN_TOKEN`, the check
    compared `undefined` with `undefined`, so a request with no
    header at all was accepted.
  - That means anyone who could reach the app could wipe the board
    with one simple request, without needing any token.
  - Fixed so the reset is refused whenever no token is set
    ("fail closed").
  - **DELETE of a missing id deleted the newest todo (fault 7):** mainly a
    correctness bug, but it also let anyone delete other people's tasks by
    requesting ids that don't exist.
- **Stack traces in error responses (fault 10):** error pages showed file
  paths, the framework and internal code structure. That helps an attacker
  map the server and plan an attack. `X-Powered-By` also advertised the
  framework.
- **Stored XSS in the web UI (fault 11):** anyone could add a task containing
  HTML/JavaScript, and it would run in the browser of every person who opened
  the board. An attacker could use it to delete or change everyone's tasks,
  show fake content, or (before fault 5 was fixed) read the admin token
  from `/api/settings` and send it to themselves.
## 5. One decision

Pick one fix where you considered more than one approach. What were the
options, and why did you choose the one you did?
the app crashed without config.json. I used {} and ingnore config.json entirely. it wont crash on start up. the was already a default in place, the fallback of port 3000 and 2000 was in place.
## 6. What happened on Friday

- Timeline (times from the log, and what happened):
- How it was possible:
- Did everything users complained about that day have the same cause?
- What should happen now, beyond deploying the fixed code:
- Summary for Taskboard's owner (not technical, 150 words at most):
All times are from `logs/access.log`, Friday 14 August 2026 (UTC). Internal
users are on `10.20.x.x`; `10.20.0.9` is the uptime monitor. The addresses
`192.0.2.77`, `203.0.113.47` and `198.51.100.23` are not internal, so the app
was reachable from outside the company network.

- **Timeline:**
  - **09:00, 12:00, 15:00:** an internal script (`10.20.8.5`, python-requests)
    tried to create a todo every 3 hours. Each time it got a **500** with a
    1187-byte error page, so its tasks never appeared (faults 9 and 10).
  - **09:41:** `192.0.2.77` (the `zgrab` internet scanner) probed `/.env`,
    `/wp-login.php`, `/admin`, `/.git/config` and more. All 404, so no harm,
    but it proves the app was exposed to the internet.
  - **10:15:** `10.20.4.12` toggled todo 123 four times in 18 seconds, and
    every response was the same 123 bytes: a user trying to un-tick a task
    that wouldn't un-tick (fault 8).
  - **11:42:10:** `10.20.4.15` sent `DELETE /api/todos/159` twice in the same
    second (a double-click). Both returned 204. The second request found no
    todo 159, so `splice(-1)` deleted the newest todo on the board, most
    likely someone else's (fault 7).
  - **13:02:11 to 13:02:31:** `203.0.113.47` (curl) loaded `/`, then `app.js`,
    then **`/api/settings`**, which returned 71 bytes. My fixed version
    returns 21 bytes, so the extra data was the admin token and version
    (fault 5).
  - **13:03:02:** reset attempt refused (403).
  - **13:03:40:** reset with the token succeeded (200). **First wipe.**
    At 13:03:52 they confirmed the board was empty (`[]`).
  - **15:47:05:** `203.0.113.47` reset again (200). **Second wipe.** They
    didn't need to fetch the token again.
  - **16:05:40 to 16:05:41:** a new address, `198.51.100.23`
    (python-requests), read `/api/settings` and reset one second later.
    **Third wipe.** That's scripted, so either the same person or the
    method had been shared.
  - **16:12:03:** the log ends mid-request (`"GET /api/to`), so this is when
    the app was switched off.

- **How it was possible:**
  - `/api/settings` gave the admin token to anyone (fault 5). This is the
    direct cause of all three wipes.
  - The app was reachable from the internet with no login in front of it.
  - Todos were only stored in memory with no backups, so each wipe was
    permanent.
  - Nothing alerted on admin resets, and the uptime monitor only checks
    `/health`, which stayed "ok" all day.

- **Did everything users complained about that day have the same cause?**
  No. There were four separate problems:
  1. All tasks disappearing (three times): outsiders using the leaked admin
     token (fault 5) on an internet-facing app.
  2. One task vanishing at 11:42: a double-click plus the DELETE bug
     (fault 7). No attacker involved.
  3. Tasks that couldn't be un-ticked: the toggle typo (fault 8).
  4. The automation's tasks never arriving: bad input crashing the app
     (fault 9), which also leaked internals (fault 10).

- **What should happen now, beyond deploying the fixed code:**
  - **Rotate the admin token.** Treat the old one as compromised, and the
    value in `config.example.json`'s git history as public.
  - **Take Taskboard off the internet** (internal network or VPN only), and
    find out why it was public: other services may be exposed the same way.
  - **Report it to the security team:** look for `203.0.113.47` and
    `198.51.100.23` in other systems' logs. Check whether the XSS bug was
    used (the log doesn't show request bodies, so it can't be ruled out).
  - **Tell users** their tasks can't be recovered and need re-entering.
  - **Contact the owner of the `10.20.8.5` script.** It will now get a
    clear 400 instead of a 500, but it needs to send `text` as a string.
  - **Add persistence and backups, and an alert on every admin reset.**

- **Summary for Taskboard's owner (not technical, 150 words at most):**

  > On Friday afternoon, someone outside the company found Taskboard on the
  > internet. A settings page the app shared with every visitor accidentally
  > included the "master key" for clearing the board. They used it to delete
  > every task three times, at about 1pm, 3:45pm and 4:05pm. Because
  > Taskboard didn't save its data anywhere permanent, those tasks can't be
  > recovered. Some other complaints that day had different causes: a bug
  > that could delete the wrong task after a double-click, tasks that
  > couldn't be un-ticked, and an automated system whose tasks were rejected.
  > All of these are now fixed. Before switching Taskboard back on, we should
  > change the master key, make sure only people inside the company can reach
  > it, keep the data safely with backups, and get an alert whenever the
  > board is cleared.

## 7. My top three improvements

Exactly three, in priority order, with your reasoning for both the choice and
the order.

1. **Restrict access.** Run Taskboard only on the internal network/VPN, put
   company sign-in in front of it, limit admin reset to the ops team and log
   who used it. Why first: Friday happened because outsiders could reach the
   app. Even with every bug fixed, anyone who can reach it can delete any
   todo.
2. **Store todos in a database with backups.** Today a restart, crash or
   reset loses everything permanently. Second, because restricting access
   makes incidents less likely, but backups make them recoverable.
3. **Automated tests and dependency checks in CI.** Every fault I found (a
   typo, a missing check, a secret in a response, an old package) is the
   kind of thing a small test suite or `npm audit` on every pull request
   would catch before release. Third, because it prevents future bugs,
   while 1 and 2 address risks that exist right now.

## 8. Optional: what I built

If you built one of your improvements: what you built, how far you got, and
what you would do next. Leave this blank if you didn't.

I didn't build an improvement; I focused on understanding and fixing the faults.

## 9. How to run my submission

- App: `cd app && npm install && npm start` (plus anything extra I've added:)
- Report script: `./report.sh <path-prefix> <path-to-log-file>` (written in [language])
- Anything else an engineer needs to know to run or test my work:
- App: `cd app && npm install && npm start`. Optional: `PORT=4000` to change
  the port; `ADMIN_TOKEN=<secret>` to enable `POST /api/admin/reset`
  (without it, reset is always refused).
- Report script: `./report.sh <path-prefix> <path-to-log-file>` (written in
  Bash, using awk and sort)
- Anything else: `./report.sh /style.css logs/access.log` reproduces the
  README's expected output. On Windows, run it in Git Bash.

## 10. How I worked

Which resources and tools you used (documentation, search, AI assistants,
people, anything else), what you used them for, and how you checked what
they told you.
Claude suggested some fixes which I applied and tested 
## 11. Reflections

- The hardest part of this exercise was:
- One thing I learned doing it:
- If I had another day, I would:
