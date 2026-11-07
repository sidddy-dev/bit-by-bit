---
title: EC2 Instance Identity Documents 
date: 2026-11-04
---

An **EC2 Instance Identity Document (IID)** is essentially the **official "birth certificate" or "digital passport"** of an EC2 instance, issued directly by the AWS hypervisor.

It is a JSON-formatted document generated dynamically when the virtual machine boots up, describing the exact environment and identity of that specific instance.

### Where Does It Come From?
It is served locally inside the instance by the **AWS Instance Metadata Service (IMDS)** at a special link-local IP (`169.254.169.254`):

```
curl http://169.254.169.254/latest/dynamic/instance-identity/document
```

Because `169.254.169.254` is a non-routable link-local address handled directly by the hypervisor/host OS:
- No Internet or NAT gateway is required.
- No AWS IAM credentials or API permissions are required.
- Traffic never leaves the physical host machine.

### What Is Inside It?
Here is an actual example of what an Instance Identity Document looks like:

```json
{
  "accountId" : "123456789012",
  "architecture" : "x86_64",
  "availabilityZone" : "eu-west-1a",
  "billingProducts" : null,
  "devpayProductCodes" : null,
  "marketplaceProductCodes" : null,
  "imageId" : "ami-0abcdef1234567890",
  "instanceId" : "i-0123456789abcdef0",
  "instanceType" : "m5.large",
  "kernelId" : null,
  "pendingTime" : "2026-11-07T07:45:10Z",
  "privateIp" : "10.0.1.42",
  "ramdiskId" : null,
  "region" : "eu-west-1",
  "version" : "2017-09-30"
}
```

### What Makes It Unique Compared to Normal Metadata?
AWS provides plenty of regular metadata (like `/latest/meta-data/hostname` or `/latest/meta-data/public-ipv4`), but the **Instance Identity Document** is special for two reasons:

**A. All critical identifiers in one structured JSON payload**
- Instead of making 10 individual HTTP requests for region, AZ, instance-id, account-id, and AMI-id, a startup script gets the entire machine profile in a single call.

**B. It is cryptographically signable by AWS**
- This is the most critical feature. AWS generates a cryptographic signature over the **exact string representation** of this document.
- You can fetch that signature right next to the document:
  - `/latest/dynamic/instance-identity/rsa2048` (RSA-2048 SHA-256 signature)
  - `/latest/dynamic/instance-identity/pkcs7` (Legacy PKCS#7 format)
- Because only AWS possesses the private key that signs this document, external systems can verify that *no one fabricated or tampered with the contents*.