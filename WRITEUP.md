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
| 6 | `app/server.js` (admin reset route) | With no `ADMIN_TOKEN` set, a request with no header could wipe the board | Read the check `header !== ADMIN_TOKEN`: with both `undefined`, `undefined !== undefined` is false, so the request was allowed | The check didn't handle the case where no token is configured | Added `!ADMIN_TOKEN ||` so reset is refused when no token is set (fail closed); tested no header, wrong and correct token with curl || 7 | `app/server.js` (delete route) | Deleting an id that doesn't exist returned 204 and deleted the newest todo instead | `curl -X DELETE /api/todos/999` returned 204, and todo 3 disappeared from the list | `findIndex` returns -1 when nothing matches, and `splice(-1, 1)` removes the last item in the array | Return 404 when the index is -1; tested delete 999 -> 404, delete 1 -> 204, delete 1 again -> 404 || 9 | `app/server.js` (POST /api/todos) | `{"text":42}` crashed with a 500 and an HTML stack trace; `{"text":"   "}` created a blank todo | Sent bad input with curl: number -> 500, spaces -> 201 with empty text | The check `!req.body.text` only tested "truthy": 42 passes and then `.trim()` fails on a number; "   " passes and trims to "" | Reject anything that isn't a non-empty string: `typeof text !== 'string' \|\| text.trim() === ''` -> 400; tested number, spaces and missing -> 400, normal text -> 201 |
## 3. What I didn't fix

Anything you found but didn't fix, or suspected but couldn't pin down, and
why. Leave this blank if there's nothing.

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

## 7. My top three improvements

Exactly three, in priority order, with your reasoning for both the choice and
the order.

1.
2.
3.

## 8. Optional: what I built

If you built one of your improvements: what you built, how far you got, and
what you would do next. Leave this blank if you didn't.

## 9. How to run my submission

- App: `cd app && npm install && npm start` (plus anything extra I've added:)
- Report script: `./report.sh <path-prefix> <path-to-log-file>` (written in [language])
- Anything else an engineer needs to know to run or test my work:

## 10. How I worked

Which resources and tools you used (documentation, search, AI assistants,
people, anything else), what you used them for, and how you checked what
they told you.

## 11. Reflections

- The hardest part of this exercise was:
- One thing I learned doing it:
- If I had another day, I would:
