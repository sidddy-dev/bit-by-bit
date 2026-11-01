---
title: Writing Reviewable Pull Requests
date: 2026-10-18
tags: code-review, git, teamwork
---

A pull request is a message to a colleague. The easier it is to understand, the faster and better the review.

## Keep it small

Small changes get reviewed carefully. Large ones get skimmed. Aim for one idea per pull request, and split refactors from behavior changes so a reviewer isn't guessing which edits matter.

## Write the description for a stranger

A useful description answers four questions:

- **What** changed?
- **Why** was it needed? Link the issue or explain the problem.
- **How** was it tested?
- **What should the reviewer look at closely?**

```text
Add retry with backoff to the payment client

Why: transient 503s from the gateway were failing checkouts.
What: retries up to 3 times with exponential backoff; no retry on 4xx.
Testing: unit tests for each branch; ran against the sandbox gateway.
Look closely at: the retry condition in client.py.
```

## Before you request review

- Read your own diff first. You will catch things.
- Run the tests and linters locally.
- Remove debug output and unrelated changes.

## As the reviewer

- Ask questions before making demands.
- Separate must-fix problems from optional suggestions.
- Say what is good, too. Review is how a team learns from each other.
