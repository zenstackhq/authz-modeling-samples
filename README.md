# Samples ZenStack schemas for different patterns of modeling authorization

## What's ZenStack

[ZenStack](https://github.com/zenstackhq/zenstack) is a NodeJS full-stack toolkit which supercharges [Prisma ORM](https://prisma.io) in many ways. Please [read here](https://zenstack.dev/docs) first.

## About This Repo

This repo contains ZModel schemas and test code that demonstrate different patterns of modeling application's authorization.

You can find more detailed explanation in the blog post [Modeling Authorization in Prisma - No Theory, Just Code](https://zenstack.dev/blog/model-authz).

## How To Run

Make sure ["pnpm" is installed](https://pnpm.io/installation).

-   pnpm install
-   cd samples/[sample folder]
-   pnpm generate
-   pnpm test

## Catalog

- [simple-acl](samples/simple-acl): simple access control list
- [simple-rbac](samples/simple-rbac): simple role-based access control
- [simple-abac](samples/simple-abac): simple attribute-based access control
- [multi-tenancy](samples/multi-tenancy): SaaS-like multi-tenancy authorization

## Not Finding What You Want?

Please join [ZenStack Discord](https://discord.gg/Ykhr738dUe) to let us know your needs.

