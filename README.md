# 🚀 The Complete Prisma + MySQL Tutorial (TypeScript)

> **From Zero to Production** — A hands-on, phase-by-phase guide for TypeScript developers.

---

## 📖 Tutorial Index

| Phase | Title | Level | File |
|-------|-------|-------|------|
| 1 | **Foundations** — Setup, Schema, Basic CRUD | 🟢 Beginner | [phase-1-foundations.md](./docs/phase-1-foundations.md) |
| 2 | **Relations & Migrations** — 1:1, 1:N, M:N, Migration Workflow | 🟡 Intermediate | [phase-2-relations.md](./docs/phase-2-relations.md) |
| 3 | **Advanced Queries** — Filtering, Pagination, Aggregation, Raw SQL | 🟡 Intermediate | [phase-3-advanced-queries.md](./docs/phase-3-advanced-queries.md) |
| 4 | **Production Patterns** — Transactions, Middleware, Seeding, Soft Delete | 🔴 Advanced | [phase-4-production.md](./docs/phase-4-production.md) |
| 5 | **Real-World Projects** — Blog API, E-Commerce, Task Manager | 🔴 Advanced | [phase-5-projects.md](./docs/phase-5-projects.md) |
| 6 | **Other Databases** — PostgreSQL, SQLite, MongoDB, CockroachDB | 🟡 Mixed | [phase-6-other-databases.md](./docs/phase-6-other-databases.md) |
| 7 | **Cheat Sheet & Best Practices** | 📋 Reference | [phase-7-cheatsheet.md](./docs/phase-7-cheatsheet.md) |

---

## 🛠 Prerequisites

- **Node.js** ≥ 18
- **TypeScript** basics (types, interfaces, async/await)
- **MySQL** 8.0+ installed (or Docker)
- A code editor (VS Code recommended with Prisma extension)

## 🗂 Project Structure (What You'll Build)

```
prisma-tutorial/
├── docs/                    # Tutorial phases (you are here!)
├── prisma/
│   ├── schema.prisma        # Your database schema
│   ├── migrations/          # Auto-generated migration files
│   └── seed.ts              # Database seeding script
├── src/
│   ├── index.ts             # Entry point
│   ├── crud.ts              # CRUD operations
│   ├── relations.ts         # Relation queries
│   └── advanced.ts          # Advanced patterns
├── package.json
├── tsconfig.json
└── .env                     # Database connection string
```

---

## ⚡ Quick Start

```bash
# Create project directory
mkdir prisma-tutorial && cd prisma-tutorial

# Initialize Node.js project
npm init -y

# Install dependencies
npm install prisma typescript ts-node @types/node --save-dev
npm install @prisma/client

# Initialize TypeScript
npx tsc --init

# Initialize Prisma with MySQL
npx prisma init --datasource-provider mysql
```

> Now open the tutorial files in order, starting with **[Phase 1](./docs/phase-1-foundations.md)** 🎯
