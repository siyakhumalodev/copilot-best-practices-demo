---
name: check-in-browser
description: Use the Playwright browser tools to check a user journey in the running ClaimsDesk web app and report what happened.
disable-model-invocation: true
argument-hint: "filtering the claims list by Submitted"
---
With the Playwright browser tools, open http://localhost:5173 and check this journey:
${input:journey:filtering the claims list by status "Submitted" shows only submitted claims}.
Report each step, what you saw, any console errors, and whether the journey passes. Do not change any code.
