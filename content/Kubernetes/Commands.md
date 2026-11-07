---
title: Handy Commands 
date: 2026-11-04
---

List resources matching a Condition (loop items, filter with select, print a field)

```bash
kubectl get <resource> -n <ns> -o json | jq -r '
  .items[]                    # loop over every object
  | select( <condition> )     # keep only the ones that match
  | <what to print>           # output a field
'

# Examples

# Pods using a specific image version
kubectl get pods -n remote-ides -o json | jq -r '
  .items[] | select(any(.spec.containers[]; .image | contains("ide:v1.9.77")))
  | .metadata.name'

# Pods that have been OOMKilled
kubectl get pods -n remote-ides -o json | jq -r '
  .items[]
  | select(any(.status.containerStatuses[]?; .lastState.terminated.reason=="OOMKilled"))
  | .metadata.name'

# PVCs that are not Bound
kubectl get pvc -n remote-ides -o json | jq -r '
  .items[] | select(.status.phase!="Bound") | .metadata.name'
```