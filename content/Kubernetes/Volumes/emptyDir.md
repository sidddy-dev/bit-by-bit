---
title: emptyDir 
date: 2026-11-03
---

In Kubernetes, an `emptyDir` is a type of volume that is created when a Pod is assigned to a node, and it exists for as long as that Pod is running on that specific node.

As the name implies, it is initially empty. All containers in the pod can read and write the same files in the `emptyDir` volume, though it can also be mounted at different paths in each container.

### Key Characteristics

**Ephemeral Lifecycle (Tied to the Pod):**
- When a pod is scheduled on a node, Kubernetes creates an empty directory on the node's disk (or in memory).
- If a container crashes, the data in the `emptyDir` is *safe* (container restarts do not delete it).
- If the *Pod* is deleted, evicted, or rescheduled to another node, the *data is permanently deleted*.

**Shared Across Containers in the Same Pod:**
- Multiple containers inside the same pod can mount the same `emptyDir`.
- In Cloud IDE, for example, `ide-logs` is mounted into the `theia` container at `/var/log` (write) and into the `logging-agent` (Fluentd) container at `/var/log/ide` (read).

**Storage Medium:**
- *Default (Disk)*: Data is stored on the node’s root filesystem (backed by whatever disk the worker node uses, such as an EBS root volume).
- *Memory (RAM / tmpfs)*: You can configure `medium: Memory` to back the volume with a RAM-based `tmpfs`. It is extremely fast, but counts toward your container’s memory limit and is wiped upon node reboot.

**sizeLimit:**
- By default, `emptyDir` shares the node's storage pool. Without a limit, a single runaway process could fill the entire node disk, impacting all other workloads on that node.
- Setting `sizeLimit` (e.g., `10Gi`) tells the `kubelet` to track usage. If the volume exceeds this threshold, the `kubelet` evicts the pod to protect the host node.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: example-pod
spec:
  containers:
  - name: app
    image: my-app:v1
    volumeMounts:
    - name: cache-volume
      mountPath: /var/cache
  volumes:
  - name: cache-volume
    emptyDir:
      sizeLimit: 5Gi       # Evicts pod if usage exceeds 5Gi
      # medium: Memory    # Optional: use RAM (tmpfs) instead of node disk
```