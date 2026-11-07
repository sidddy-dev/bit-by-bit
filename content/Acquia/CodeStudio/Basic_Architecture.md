In Code Studio (`gitlab-service`), container images are split across distinct functional layers: the core GitLab application (CNG), infrastructure dependencies, customer-facing CI/CD build environments, and the middleware API.

### Core GitLab Cloud-Native Images (CNG)
Extracted directly from the upstream GitLab Helm chart:

gitlab-webservice, gitlab-sidekiq, gitaly, gitlab-shell, gitlab-container-registry, gitlab-kas, and gitlab-runner

**gitlab-webservice**
- The core Ruby on Rails application and REST/GraphQL API. Serves web traffic and user interactions.
```
gitlab-acquia-webservice-default-65954777f7-fx72v     2/2     Running       0              134m
gitlab-acquia-webservice-default-65954777f7-sqkjq     2/2     Running       0              135m
```
- 2 Containers
  - webservice: `edge.jfrog.ais.acquia.io/devops-pipeline-prod/codestudio/gitlab-webservice-ce`
  - gitlab-workhorse: `edge.jfrog.ais.acquia.io/devops-pipeline-prod/codestudio/gitlab-workhorse-ce`

**gitlab-sidekiq**
- Asynchronous background queue worker processing jobs (mailers, background sync, pipeline scheduling) backed by Redis.
```
gitlab-acquia-sidekiq-all-in-1-v2-75d7bcb848-mrgf6    1/1     Running       0              142m
```
- 1 Container
  - gitlab-sidekiq-ce: `edge.jfrog.ais.acquia.io/devops-pipeline-prod/codestudio/gitlab-sidekiq-ce`
- Path of Dockerfile: `helm/cs-gitlab-operator/extended-images/gitlab-sidekiq-ce/Dockerfile`
```
# Build the Gitlab sidekiq image.
ARG TARGET_VERSION
FROM registry.gitlab.com/gitlab-org/build/cng/gitlab-sidekiq-ce:${TARGET_VERSION}
```

**gitaly**
- Git RPC service deployed as a Kubernetes `StatefulSet`. Manages repository disk storage, Git operations, and RPCs for repository data.
```
gitlab-acquia-gitaly-0                                1/1     Running       0              156m
```
- 1 Container
  - gitaly: `edge.jfrog.ais.acquia.io/devops-pipeline-prod/codestudio/gitaly`


```
# Build the Gitlab gitaly image.
ARG TARGET_VERSION
FROM registry.gitlab.com/gitlab-org/build/cng/gitaly:${TARGET_VERSION}
```

**gitlab-shell**
- Lightweight service handling Git over SSH authorization and authentication.
```
gitlab-acquia-gitlab-shell-585659486f-95hf6           1/1     Running       1 (93m ago)    158m
gitlab-acquia-gitlab-shell-585659486f-bvkf5           1/1     Running       1 (93m ago)    159m
gitlab-acquia-gitlab-shell-585659486f-s9t5k           1/1     Running       1 (93m ago)    159m
gitlab-acquia-gitlab-shell-585659486f-zkc2w           1/1     Running       1 (93m ago)    159m
```

```
# Build the Gitlab shell image.
ARG TARGET_VERSION
FROM registry.gitlab.com/gitlab-org/build/cng/gitlab-shell:${TARGET_VERSION}
```

---

### Extended CI/CD Images (What customer pipelines actually run)
- `codestudio-ci-container / testing-container`: Default container used by customer CI jobs to run tests, linting, and build steps.
- `node-container`: Image equipped for frontend builds.
- `drupal-image`: Specialized image for Drupal application testing.
- Tooling packaged inside these containers:
  - PHP runtimes (e.g., 8.2, 8.3, 8.4, 8.5)
  - Composer
  - Node.js / NVM
  - Google Chrome & ChromeDriver (headless browser testing)
  - Acquia CLI (ACLI)
  - Ruby

---

### Operator & Security Scanners
- `gitlab-operator`: Kubernetes operator reconciling the GitLab Custom Resource (CR).
- `generic-ubuntu-base`: Standard hardened base image.
- `semgrep-sast`, `sobelow-sast`, `secret-detection`: Code security scanning analyzers.
- `kaas-egress-ip` / `gateway`: Manages static egress IP routing.

---

## UPDATES

### Scenario B: You want to keep GitLab core strictly on 18.11.13 (Or a Specific Version), but update customer build tools & dependencies
If you want to leave GitLab's core Rails/Gitaly/Webservice images untouched, but update the tooling customers run in CI/CD (Node, PHP, Chrome, Composer, base OS security patches):

Do not run `update-gitlab.sh`. Instead, run the container dependency scripts:

1. Run the package & dependency updates:
```
# Option 1: Run all package updates via Makefile
make update-packages

# Option 2: Run the individual scripts manually
./update-dependencies.sh   # Bumps Chrome, ChromeDriver, Composer, ACLI, Ruby
./update-php-versions.sh   # Bumps PHP versions and extensions
./update-nodejs-version.sh # Bumps NVM and Node.js
```