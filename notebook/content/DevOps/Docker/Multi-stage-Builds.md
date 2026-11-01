---
title: Multi-stage Builds
date: 2026-10-24
tags: docker, containers, images
---

A multi-stage build uses several `FROM` lines in one Dockerfile. Early stages hold compilers and build tools. The final stage copies in only what the app needs to run, so the shipped image is small and has fewer things to attack.

## Example: a Go service

```dockerfile
# Stage 1: build
FROM golang:1.23 AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /out/app ./cmd/app

# Stage 2: run
FROM gcr.io/distroless/static-debian12
COPY --from=build /out/app /app
USER nonroot
ENTRYPOINT ["/app"]
```

The final image has no shell, no package manager and no Go toolchain, only the binary and a minimal base.

## Habits that pay off

- Copy dependency manifests and install before copying the rest of the source. Layers are cached, so code changes don't redo the install.
- Add a `.dockerignore` so `.git`, `node_modules` and local build output stay out of the build context.
- Run as a non-root user.
- Pin base image versions, and consider pinning by digest for production.
- Name stages (`AS build`) and use `--target` to build just one, which is handy for a test stage.
