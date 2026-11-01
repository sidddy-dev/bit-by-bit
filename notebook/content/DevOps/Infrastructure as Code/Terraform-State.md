---
title: Terraform State
date: 2026-10-22
tags: terraform, iac, state
---

Terraform keeps a **state file** that records which real resources belong to which blocks in your configuration. When you run `plan`, Terraform compares your code, the state, and the real infrastructure, and works out what to change.

## Why it matters

- Without state, Terraform can't tell that the bucket in your code is the bucket that already exists.
- State can contain sensitive values in plain text, so treat it like a secret.
- If two people apply at once from separate local files, they will overwrite each other's view of the world.

## Use a remote backend

Store state in shared, access-controlled storage with locking:

```hcl
terraform {
  backend "s3" {
    bucket  = "my-team-tfstate"
    key     = "prod/network/terraform.tfstate"
    region  = "ap-south-1"
    encrypt = true
  }
}
```

Locking stops two applies from running at the same time. Recent Terraform versions can lock S3 state natively; older setups paired the bucket with a DynamoDB table. Check the documentation for the version you run.

## Useful commands

```bash
terraform state list
terraform state show aws_s3_bucket.assets
terraform plan -out=tfplan
terraform apply tfplan
```

## Rules of thumb

- Don't edit the state file by hand. Use `terraform state` subcommands, `moved` blocks or `import`.
- Split state by blast radius, for example one state per environment or per component.
- Review the plan output before every apply, especially lines marked for replacement.
