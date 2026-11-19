---
name: handover
description: "Write a short handover note so a fresh chat session can continue this work with a small, clean context."
disable-model-invocation: true
---
Write `reports/HANDOVER.md` for the work in this session in at most 40 lines: the goal; decisions made and why; files
changed (paths only - no code); tests and their status; open questions; the exact next step.
Then tell me to start a new chat session and attach #file:reports/HANDOVER.md as the only context.
