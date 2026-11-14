---
title: Load Average
date: 2026-11-10
---

Load average is a measure of how busy a Unix/Linux system is. It’s the average number of processes that are either running on the CPU or waiting for it (or, on Linux, stuck waiting on disk I/O) over a window of time.

You usually see three numbers, for the last 1, 5, and 15 minutes:
```
load average: 0.52, 0.80, 1.10
```

Commands like `uptime`, `top`, and `w` show it.

**How to read it**
- On a 4-core machine, a load of 4.0 means the CPUs are fully used with nothing waiting.
- Below 4.0 means there’s spare capacity.
- Above 4.0 means processes are queuing for CPU time.

A single-core machine at 1.0 is at capacity, while the same load on an 8-core machine is only about 12% utilized.

**Reading the three numbers together**
- 1-min higher than 15-min: load is rising (something just started).
- 1-min lower than 15-min: load is falling (a busy period is ending).
- All three about equal: steady state.


### High Load Average But Low CPU Usage

**The Core Reason: What "Load Average" Actually Counts**
- CPU Utilization measures only the percentage of clock cycles the CPU cores spend executing instructions (`user`, `system`, etc.) versus being `idle`.
- Linux Load Average does not just count tasks using or waiting for the CPU. In Linux, load average is the exponentially decayed average of threads in two states:
  `Load = Threads in R(Running / Runnable) + Threads in D(Uninterruptible Sleep)

When tasks enter the `D` state (`TASK_UNINTERRUPTIBLE`), they are usually waiting in kernel space for hardware, disk I/O, or a network filesystem call to complete.

Because they cannot be interrupted (even by `kill -9`), the kernel considers them as active demand on system capacity.

### Incident of High Load Average

**What Happened (The Incident)**

In Acquia Cloud Next (ACN) in `us-east-1`, multiple customer applications share an underlying AWS Elastic File System (EFS) cluster (`fs-01d69d863e78201f8`) for their Drupal files and asset storage.
- One high-traffic customer site (`wddse.cms.gov`) suddenly initiated massive, sustained filesystem operations.
- This high I/O completely drained the shared EFS cluster's *burst credit balance to zero*.
- Cascading alerts fired across 21 co-tenanted customer sites (including Papa John's, Perrigo Intranet, Bessemer, and Princeton Alumni). Web health checks failed and sites started returning 503 Service Unavailable / Gateway Timeout errors.

**Why Load was High but CPU was Low (The Mechanism)**
- *Throttled Throughput*: When AWS EFS runs out of burst credits, AWS caps file system throughput down to its baseline (often as low as a few megabytes per second).
- *Worker Freezes*: Drupal web pods on every tenant sharing that EFS volume needed to read and write files (Twig template caches, module files, media uploads). Every time a PHP worker executed a system call like `stat()`, `file_get_contents()`, or `flock()` on the EFS mount, the call stalled waiting for the throttled network file system.
- *Queueing in D State*: Hundreds of PHP-FPM processes across the hosts entered the kernel `D` state (Uninterruptible Sleep).
- *The Load Spike*: Because Linux counts every D-state thread toward the load average, the load average soared into the dozens, while the actual CPU cores sat mostly idle (~10–20% utilization) waiting for disk responses.

**How It Was Solved**
- Modified the EFS volume configuration in AWS: changed the Throughput Mode from `Bursting` to `Elastic`.
- Why this worked immediately: In Elastic mode, AWS removes the burst credit bucket constraint entirely and automatically scales throughput to match current demand. Within minutes, the network bottleneck cleared, stuck kernel I/O calls returned, the queued PHP workers completed, and the load average dropped back down to normal.

### How the Issue was Identified

**Step 1: Detect that the Load is I/O Wait, Not CPU**   

```bash
vmstat 1 5
```
- Column `r` (runnable tasks) is low (~2–4).
- Column `b` (blocked tasks waiting for I/O) is very high (30–40+).
- In CPU percentages, `us` (user) and `sy` (system) are low (~15–20%), but `wa` (I/O wait) or idle is elevated.

**Step 2: Identify Stuck Processes in D State**

```bash
ps -eo state,pid,user,cmd | grep "^D"
```
- Dozens of `php-fpm: pool www` workers listed with status D (Uninterruptible Sleep).

**Step 3: Inspect the Kernel Stack of Blocked Workers**
- To determine what the `D-state` processes are waiting on:
```bash
cat /proc/<PID>/stack
```
- Functions related to the NFS/EFS client network layer, such as:
  - `io_schedule`
  - `nfs_wait_bit_killable`
  - `nfs4_proc_lookup` or `nfs_revalidate_inode`
- This confirmed that `PHP-FPM` workers were freezing while attempting to read, write, or `stat` files over the network mount.

**Step 4: Verify the Filesystem Responsiveness**

It was tested if file operations on the shared mount hang:
```bash
# A hanging df command is the classic sign of an unresponsive remote filesystem
timeout 5s df -h /mnt/files

# Check NFS/EFS client statistics and latency
nfsstat -m
```

**Step 5: Pinpoint the Underlying AWS EFS Cluster**

In Kubernetes environments, nodes mount persistent volumes backed by EFS. Volume handle was retrieved and AWS metrics was checked
```bash
# Identify which EFS filesystem ID is mounted
mount | grep -i efs
# e.g., fs-01d69d863e78201f8.efs.us-east-1.amazonaws.com mounted on /shared
```

Using CloudWatch
```bash
aws cloudwatch get-metric-data --metric-data-queries '[
  {
    "Id": "burst",
    "MetricStat": {
      "Metric": {
        "Namespace": "AWS/EFS",
        "MetricName": "BurstCreditBalance",
        "Dimensions": [{ "Name": "FileSystemId", "Value": "fs-01d69d863e78201f8" }]
      },
      "Period": 60,
      "Stat": "Average"
    }
  },
  {
    "Id": "io_limit",
    "MetricStat": {
      "Metric": {
        "Namespace": "AWS/EFS",
        "MetricName": "PercentIOLimit",
        "Dimensions": [{ "Name": "FileSystemId", "Value": "fs-01d69d863e78201f8" }]
      },
      "Period": 60,
      "Stat": "Maximum"
    }
  }
]' --start-time 2026-11-06T23:00:00Z --end-time 2026-11-07T01:30:00Z
```

The Smoking Gun Found in AWS Metrics:
- `BurstCreditBalance`: Plunged down to 0.
- `PercentIOLimit`: Hit 100%.
- `ClientConnections`: Spiked significantly.

This proved that the shared filesystem had been throttled to baseline throughput by AWS, causing file I/O operations to stall across all 21 tenant applications sharing that volume.



