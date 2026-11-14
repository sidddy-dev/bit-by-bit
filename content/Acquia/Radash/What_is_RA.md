---
title: What is RA
date: 2026-11-09
---

- RA means Remote Administration. It’s Acquia’s service for applying routine Drupal security updates to customer websites

**A customer has a website**
- People visit it every day. We call this the live website, or Production.
- RA needs to apply security updates, but we don’t want to risk breaking that live website

**RA prepares the changes separately**
- Think of editing a copy of an important document, rather than changing the original immediately.
- Production code = the original document.
- RA branch = a separate working copy of that code.
- Merge = bring changes from one copy into the other.

**How RA patches a website**
1. Find and prepare the fix
  - Every Wednesday, the robot checks all the websites.
  - It asks each live website: "Do you have any old, unsafe parts?"
  - If it finds some, it copies the website's code into a separate test area called the RA environment.
  - It updates the unsafe parts in that copy, using Composer for Drupal 8 and newer, or Drush for Drupal 7.
  - It saves the result as a new branch, which is a separate saved copy of the code.
  - It tells the customer: "Please test the updated copy."

2. Try it on Stage
  - After the customer approves, the robot checks that nothing new was added to the live site in the meantime.
  - If everything matches, it puts the updated copy on Stage, a practice website.

3. Put it on the live website
  - After the customer approves again, the robot does the same check one more time
  - Then it puts the updated copy on the live website (Production).

