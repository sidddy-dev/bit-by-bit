---
title: Deployments and Rolling Updates
date: 2026-10-29
tags: kubernetes, deployments, rollout
---

A Deployment declares the Pods you want and lets Kubernetes keep reality matching it. Under the hood a Deployment owns **ReplicaSets**, and each ReplicaSet owns the Pods for one version of your Pod template.

## How an update works

When you change the Pod template (for example a new image tag), the Deployment creates a new ReplicaSet and gradually scales it up while scaling the old one down. The pace is controlled by two settings:

- `maxSurge`: how many extra Pods may exist above the desired count during the update.
- `maxUnavailable`: how many Pods may be unavailable during the update.

Both default to 25%.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 4
  selector:
    matchLabels:
      app: api
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: registry.example.com/api:1.4.0
```

With `maxUnavailable: 0` and `maxSurge: 1`, a new Pod must become Ready before an old one is removed.

## Everyday commands

```bash
kubectl set image deployment/api api=registry.example.com/api:1.5.0
kubectl rollout status deployment/api
kubectl rollout history deployment/api
kubectl rollout undo deployment/api
```

> Readiness probes decide when a new Pod counts as available. Without one, a rolling update can send traffic to a Pod that isn't ready.
