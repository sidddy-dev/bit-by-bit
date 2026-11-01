---
title: Debugging CrashLoopBackOff
date: 2026-10-31
tags: kubernetes, debugging, troubleshooting
---

`CrashLoopBackOff` means a container keeps starting, exiting, and being restarted. Kubernetes waits longer between each attempt, doubling the delay up to a maximum of five minutes, which is the "back-off" part.

## Work through it in order

1. **Read the events.**

```bash
kubectl describe pod <pod>
```

Look at `Last State`, `Reason` and `Exit Code`.

2. **Read the logs of the crashed run.**

```bash
kubectl logs <pod> --previous
```

The current container may have just started and have nothing to say. `--previous` shows the one that died.

3. **Decode the exit code.**

- `1` or another small number: the application itself failed (bad config, missing env var, can't reach a dependency).
- `137`: the process was killed, often with reason `OOMKilled` when the memory limit was hit.
- `139`: segmentation fault.
- `143`: terminated by SIGTERM.

4. **Check the probes.** A liveness probe that fires before the app is ready will kill a healthy container over and over. Add a `startupProbe` or lengthen `initialDelaySeconds`.

5. **Run it by hand.** Override the command to get a shell and inspect the environment:

```bash
kubectl run debug --rm -it --image=<same-image> --command -- sh
```

## Common causes

- A required ConfigMap or Secret key is missing.
- The memory limit is lower than the app needs.
- The command or args in the manifest are wrong for the image.
- A dependency such as a database isn't reachable yet and the app exits instead of retrying.
