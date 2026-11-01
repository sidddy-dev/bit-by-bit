---
title: Services Explained
date: 2026-10-30
tags: kubernetes, services, networking, dns
---

Pods come and go, and their IPs change with them. A Service gives a set of Pods one stable virtual IP and DNS name, and spreads traffic across the healthy ones.

## How a Service finds its Pods

A Service selects Pods by **label**. Any Pod that matches the selector and is Ready becomes an endpoint.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api
spec:
  selector:
    app: api
  ports:
    - port: 80
      targetPort: 8080
```

Inside the cluster, other Pods reach it at `api` (same namespace) or `api.<namespace>.svc.cluster.local`.

## Service types

- **ClusterIP** (default): reachable only inside the cluster.
- **NodePort**: also opens a port on every node.
- **LoadBalancer**: asks the cloud provider for an external load balancer.
- **ExternalName**: maps the Service name to an external DNS name.

## Debugging checklist

If a Service doesn't respond, check the endpoints first:

```bash
kubectl get endpoints api
kubectl get pods -l app=api
```

An empty endpoints list almost always means the selector doesn't match the Pod labels, or the Pods aren't Ready.
