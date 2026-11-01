---
title: Monolith or Microservices
date: 2026-10-16
tags: architecture, microservices, design
---

This question gets argued as if one answer wins everywhere. It doesn't. Each option trades one set of problems for another.

## The monolith

One deployable unit with one codebase.

- Simple to build, run, debug and deploy.
- Function calls instead of network calls, so no partial failures between modules.
- Gets hard when many teams change the same code, or one part needs to scale alone.

## Microservices

Many small services, each owned by a team and deployed independently.

- Teams can ship without coordinating every release.
- Parts can scale and fail separately.
- You pay for it: network latency, distributed failures, versioned APIs, harder debugging, and much more operational work.

## How to decide

- **Team size matters most.** A handful of engineers rarely benefits from the overhead of many services.
- **Start modular.** A monolith with clear internal boundaries is easy to split later and easy to live with in the meantime.
- **Split for a reason.** Good reasons include a different scaling profile, a different release cadence, or a boundary that matches a separate team.
- **Don't share a database across services.** If services read each other's tables, you have a distributed monolith with the downsides of both.

> Pick the simplest structure that your current team and problem can support, and keep the boundaries clean enough to change later.
