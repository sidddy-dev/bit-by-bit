---
title: RA Architecture
date: 2026-11-09
---

In Acquia's **Remote Administration (RA)** ecosystem, automated patching and security updates are driven by *RADash (Remote Administration Dashboard)* acting as the central coordination and reporting layer, while *RA-UP (and Automatic Updater)* acts as the execution engine on bastion workers.

```
 +-----------------------------------------------------------------------------------+
 |                             Orchestration & State                                 |
 |                                                                                   |
 |  +-----------------------+     REST API     +----------------------------------+  |
 |  |  RADash (Drupal App)  |<================>|            RADash-API            |  |
 |  | - Customer prefs      |                  +----------------------------------+  |
 |  | - App & version store |                                  |                     |
 |  | - Status & audit logs |                                  v                     |
 |  +-----------------------+                    +---------------------------+       |
 |              ^                                |   AWS SQS Queues          |       |
 |              | Customer / Account Sync        |  - Step 1 (Weekly / Ad-hoc) |       |
 |              v                                |  - Step 2 (RA -> Stage)   |       |
 |  +-----------------------+                    |  - Step 3 (Stage -> Prod) |       |
 |  |  Acquia Cloud / CCI   |                    +---------------------------+       |
 +-------------------------------------------------------------|---------------------+
                                                               | Polled by cron-dequeue
                                                               v
 +-----------------------------------------------------------------------------------+
 |                   Execution Engine (bastion-22 / ahrabot)                         |
 |                                                                                   |
 |   +---------------------------------------------------------------------------+   |
 |   |              RA-UP (Symfony Console CLI) & Automatic Updater (AU)         |   |
 |   +---------------------------------------------------------------------------+   |
 |         | SSH / ah-site-exec             | Cloud API v2              | eAPI       |
 +---------|--------------------------------|---------------------------|------------+
           |                                |                           |
           v                                v                           v
 +----------------------------------+ +-------------------+ +-----------------------+
 | Customer Environments            | | Acquia Hosting API| | Service Cloud / Jira  |
 |                                  | | - Deploy branches | | - Create/update       |
 |  [Prod Env]                      | | - Copy databases  | |   support tickets     |
 |  - Detect active tag & version   | | - Switch tags     | | - Poll approvals      |
 |  - Source for DB snapshot        | +-------------------+ +-----------------------+
 |                                  |
 |  [RA Env]                        |
 |  - Clean build & patch apply     |
 |  - Composer / Drush update       |
 |  - Test sanitized DB + proxy     |
 |                                  |
 |  [Stage / Dev Env]               |
 |  - Intermediate staging (Step 2) |
 +----------------------------------+
 ```

 ## Core Architecture Components

### 1. RADash & RADash-API (State & Inventory)
- **RADash** (`radash.acquia.com`): A centralized internal application that maintains customer metadata, application inventories, PHP/Drupal versions, and customer-configured RA preferences:
  - `pref_update`: e.g., Update and Deploy, Inform Only, or Do Not Inform.
  - `pref_deploy_at`: Configured maintenance windows for production releases.
  - `deploy_testenv`: Which non-prod environment to use for staging (Stage vs. Dev).
- **RADash-API**: A REST layer that worker scripts use to fetch application settings, register execution runs, and post back operation statuses and logs.

### 2. Discovery & Queuing Engine (AWS SQS & Crons)
- **Discovery / Scans** (`ra-datapulls`): Scans customer environments to identify running versions of Drupal core and contributed modules, comparing them against newly published security advisories (typically on Wednesdays matching Drupal.org's release cycle).
- **AWS SQS Queues**: Manages update tasks across three distinct stages (Step 1, Step 2, Step 3).
- **Cron Orchestrators (ahrabot@bastion-22)**:
  - `cron-weekly-enqueue.sh`: Pushes eligible customer apps into the SQS Step 1 queue.
  - `cron-dequeue.sh 1/2/3`: Polls queues every few minutes and triggers ra-up with the respective step.
  - `cron-enqueue.sh 2/3`: Periodically checks customer ticket approval statuses in Service Cloud to move approved tickets into the Step 2 and Step 3 queues.

### 3. Execution Engine (`RA-UP` & Automatic Updater)
- Runs as a Symfony Console application on worker bastions under the `ahrabot` service account.
- **Automatic Updater (AU)**: Handles package resolution and patching:
  - For Drupal 8+ / 9 / 10+: Invokes composer require / composer update --with-all-dependencies for vulnerable packages and generates standard patch commit messages.
  - For Drupal 7: Uses `drush pm:security` and `drush pm:updatecode`.

### The 3-Step Patch Lifecycle

```
[Weekly Scan / SQS Enqueue]
         │
         ▼
┌──────────────────┐
│     Step 1       │ ──► Branch from Prod tag ──► Apply Composer/Drush patch ──►
└──────────────────┘     Deploy to .ra env    ──► Copy DB & sanitize         ──► Open Support Ticket
                                                                                       │
                                                      ┌────────────────────────────────┘
                                                      ▼
                                            [Customer Reviews on RA]
                                                      │ (Approved)
                                                      ▼
┌──────────────────┐
│     Step 2       │ ──► Verify no Prod commit drift ──► Deploy AcquiaRA tag to Stage ──►
└──────────────────┘     Sync latest Prod DB          ──► Update Ticket for final sign-off
                                                                                       │
                                                      ┌────────────────────────────────┘
                                                      ▼
                                            [Customer Reviews on Stage]
                                                      │ (Approved)
                                                      ▼
┌──────────────────┐
│     Step 3       │ ──► Verify no Prod commit drift ──► Respect scheduled deploy window ──►
└──────────────────┘     Deploy & tag on Prod         ──► Run drush updb & clear cache    ──► Close Ticket
```

**Step 1: Detect, Patch, and Deploy to RA**
1. *Pre-flight Checks*: Verifies that Production has a working Drupal instance, checks PHP version parity between Prod and RA, and loads RA preferences.
2. *Clean Baseline*: Determines the exact tag or commit running on Production (e.g., `tags/2026-10-21`) to branch from.
3. Patching: Runs Composer/Drush security updates locally or in the site workspace, committing changes to a newly created branch: `AcquiaRA-<YYYY-MM-DD-HH-MM-SS>`.
4. *Environment Deployment*:
  - Uses Acquia Cloud API to switch `directory.ra` to the new `AcquiaRA-*` branch
  - Copies the Production database down to `directory.ra`.
  - Runs `sqlsan` to sanitize customer PII/sensitive data.
  - Enables `stage_file_proxy` so media/assets render from Prod without copying gigabytes of files.
  - Runs `drush updatedb` and `drush cache:rebuild`.
5. *Customer Ticket Creation*: Posts a ticket via Service Cloud API informing the customer that patches are ready for acceptance testing on their RA environment.

**Step 2: Staging Deployment (Post-Customer Approval)**
1. *Approval Detection*: SQS dequeue picks up the ticket once marked approved by the customer.
2. *Divergence Guard*: Compares the `AcquiaRA-*` branch against current Production. If new commits were pushed to Prod in the meantime (e.g., customer emergency hotfix), it halts to avoid overwriting production work.
3. *Stage Deploy*: Switches the customer’s designated Test/Stage environment to the RA branch, refreshes the database from Prod, and requests final deployment approval.

**Step 3: Production Deployment**
1. *Divergence Guard*: Performs a final safety check ensuring the branch contains all production commits.
2. *Window Check*: Checks `pref_deploy_at`   to respect customer maintenance hours (or executes immediately if set to default).
3. *Prod Cutover*: Deploys the patched tag to Production, executes database updates (drush updb), clears caches, and marks the support ticket completed.

### Key Architectural Safeguards

**Divergence Verification** Prevents race conditions. If Production moves ahead while a branch is awaiting approval, `ra-up` refuses to merge/deploy and flags the missing commits.

**Data Sanitization (`sqlsan`)** Ensures production user passwords and emails are scrubbed when copying DBs down to the RA testing tier.

**stage_file_proxy** Avoids copying entire file directories (saving disk space and network bandwidth) while ensuring images and static assets load during RA testing.

**Welcome Tag Fallback** When an RA environment fails or needs a wipe, it reverts to `tags/WELCOME` to release resources and prevent broken code from lingering.





