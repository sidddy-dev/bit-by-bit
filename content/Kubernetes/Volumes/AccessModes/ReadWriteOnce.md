---
title: Read Write Once
date: 2026-11-03
---

ReadWriteOnce (RWO) means the volume can be mounted with read and write access by one node at a time.

```
A simple analogy

Think of a USB pen drive. You can plug it into one laptop at a time, and that laptop can read and write freely. To use it on another laptop, you first have to unplug it from the first one. An EBS volume works the same way: it is “plugged into” one EC2 node at a time.
```

What “once” does and doesn’t limit
- It limits *nodes*, not pods. Several *pods* on the same node can all use the volume together.
- A pod on a *different node* must wait until the volume is detached from the first node.

```yaml
# Declared in PVC
spec:
  accessModes:
    - ReadWriteOnce      # this is RWO
  storageClassName: gp2
  resources:
    requests:
      storage: 1Gi
```

### RWO (ReadWriteOnce) volume attachment conflicting with a RollingUpdate.

**Starting state (before the addon update)**
```
Node -52:  grafana-64d8cdbf98-5mxzh  (Running)
           └── EBS volume pvc-8ad2d4ee... attached here (RWO)
```
- Grafana runs as a Deployment with 1 replica, and its data lives on a 1Gi EBS gp2 volume with RWO access.

**Step 1: We Ran the addon update**
- The update changes the Grafana Deployment (a new chart version, image 13.3.0). Kubernetes creates a new ReplicaSet and, because the strategy is the default *RollingUpdate*, follows this rule: *start the new pod first, remove the old one only after the new one is Ready*.

**Step 2: The scheduler places the new pod**
```
Node -52:   old pod (Running, holds the volume)
Node -117:  new pod grafana-5779c87fc4-qz9gj  ← scheduler chose this node
```
- The scheduler doesn’t block on the EBS attachment, so it was free to pick a different node.

**Step 3: The new pod can’t get the volume**
- Before starting any container, the kubelet on `-117` must mount the grafana PVC. But the VolumeAttachment shows the volume is attached to `-52`, and RWO allows only one node at a time. So the mount waits.
```
Pod status:  Init:0/1
Init container:  Waiting / PodInitializing  (never started)
IP:  <none>  (sandbox never created)
```

**Step 4: The deadlock**
```
New pod  →  needs the volume  →  held by the old pod
Old pod  →  stays until the new pod is Ready  →  new pod can't be Ready
```

**The fix**
- Scaling the Deployment to 0 removes the old pod, which releases the volume. Scaling back to 1 creates a pod that attaches it with no competition.
- The permanent fix is `strategy: Recreate`, which reverses the order (old pod removed first, then new pod created) so the deadlock can’t form.