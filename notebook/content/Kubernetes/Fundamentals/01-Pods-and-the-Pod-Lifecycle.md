---
title: Pods and the Pod Lifecycle
date: 2026-10-28
tags: kubernetes, pods, basics
---

A Pod is the smallest thing Kubernetes schedules. It wraps one or more containers that share a network namespace (one IP, one set of ports) and can share volumes. Most Pods hold a single container; extra containers are usually helpers such as a log shipper or a proxy.

## The Pod phases

A Pod reports a high level `phase` in its status:

- **Pending**: accepted by the cluster, but one or more containers are not running yet. It may be waiting for a node, or pulling images.
- **Running**: bound to a node and at least one container is running or starting.
- **Succeeded**: every container exited with status 0 and will not restart.
- **Failed**: every container has terminated and at least one failed.
- **Unknown**: the node can't be reached, so the state can't be read.

Each container also has its own state: `Waiting`, `Running` or `Terminated`. When a Pod looks stuck, the container state and its reason tell you far more than the phase.

## A minimal Pod

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: hello
  labels:
    app: hello
spec:
  containers:
    - name: web
      image: nginx:1.27
      ports:
        - containerPort: 80
```

```bash
kubectl apply -f pod.yaml
kubectl get pod hello -o wide
kubectl describe pod hello
```

## Remember

- Pods are disposable. If a node dies, a bare Pod is not rebuilt elsewhere.
- Controllers such as Deployments create and replace Pods for you, so you rarely apply a bare Pod outside of experiments.
- The Events section at the bottom of `kubectl describe pod` is the first place to look when something is wrong.
