---
title: Anatomy of a Pipeline
date: 2026-10-26
tags: ci-cd, pipelines, github-actions
---

A pipeline is an automated path from a commit to a running service. Good ones give fast feedback first and spend the slow, expensive checks later.

## Typical stages

1. **Build**: compile the code and produce an artifact.
2. **Test**: unit tests first, then slower integration tests.
3. **Scan**: dependency and static analysis checks for known vulnerabilities and code issues.
4. **Package**: build and tag a container image or release bundle.
5. **Deploy**: roll it out to staging, then production.

## A small GitHub Actions example

```yaml
name: ci
on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
```

## Principles worth following

- **Fail fast.** Put linting and unit tests before anything that takes minutes.
- **Build once, deploy many.** The artifact tested in staging should be the exact one that goes to production.
- **Keep it reproducible.** Pin versions of tools and base images so a rerun gives the same result.
- **Cache dependencies.** It is usually the cheapest speedup available.
- **Treat the pipeline as code.** Review changes to it like any other change.
