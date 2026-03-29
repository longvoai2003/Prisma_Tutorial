# Phase 1: Foundations — Setup, Schema & Basic CRUD

> 🟢 **Level**: Beginner | ⏱ **Time**: 30-45 minutes

---

## 1.1 Understanding Prisma

Prisma is a **next-generation ORM** for Node.js and TypeScript. It consists of three tools:

| Tool | Purpose |
|------|---------|
| **Prisma Client** | Auto-generated, type-safe query builder |
| **Prisma Migrate** | Declarative database migration system |
| **Prisma Studio** | GUI to view/edit your database |

### Why Prisma over other ORMs?

```
Traditional ORMs (TypeORM, Sequelize)     vs.     Prisma
─────────────────────────────────────             ─────
❌ Loose types, runtime errors                   ✅ 100% type-safe queries
❌ Complex query builder APIs                    ✅ Intuitive, object-like API
❌ Manual migration scripts                      ✅ Auto-generated migrations
❌ No visual DB browser                          ✅ Prisma Studio built-in
```

---

## 1.2 Prisma 7 Architecture — The Adapter Pattern

> ⚡ **Important for beginners**: Prisma 7 changed how your app connects to the database. Read this section carefully!

### Before Prisma 7 (the old way)

In older versions (Prisma 5, 6), the database URL lived inside `schema.prisma` and Prisma handled the connection internally:

```prisma
// ❌ OLD WAY — Prisma 5/6 (no longer works in Prisma 7!)
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")   // ← This line is REMOVED in Prisma 7
}
```

### Prisma 7 (the new way) — Three separate pieces

In Prisma 7, the connection is split into **3 parts**, each with a clear job:

```
┌─────────────────────────────────────────────────────────────┐
│                    YOUR APP (index.ts)                       │
│                                                             │
│   1. ADAPTER  ──→  Speaks your database's language          │
│       ↓            (PrismaMariaDb for MySQL/MariaDB)        │
│   2. PRISMA CLIENT ──→ Uses the adapter to talk to DB       │
│                                                             │
│   3. prisma.config.ts ──→ Used ONLY by CLI tools            │
│       (migrations, studio, etc.)                            │
└─────────────────────────────────────────────────────────────┘
```

### What is an Adapter?

Think of an **adapter** like a power plug converter when you travel:

```
Your Laptop  ──→  Plug Adapter  ──→  Wall Socket
(Prisma Client)   (PrismaMariaDb)    (MySQL Database)
```

- **Your laptop** = Prisma Client (your TypeScript code)
- **The adapter** = `PrismaMariaDb` (translates Prisma's requests into MySQL queries)
- **The wall socket** = Your MySQL database

The adapter is a **translator** that sits between Prisma and your database. Different databases need different adapters:

| Database | Adapter Package | Adapter Class |
|----------|----------------|---------------|
| MySQL / MariaDB | `@prisma/adapter-mariadb` | `PrismaMariaDb` |
| PostgreSQL | `@prisma/adapter-pg` | `PrismaPg` |
| SQLite | `@prisma/adapter-libsql` | `PrismaLibSQL` |

### Why did Prisma make this change?

1. **More control** — You can configure connection pools, timeouts, etc. yourself
2. **Edge/serverless support** — Adapters work in environments like Cloudflare Workers
3. **Flexibility** — You can swap databases without changing your Prisma queries
4. **Separation of concerns** — CLI config vs. runtime config are clearly separated

### The two config files explained

| File | Used by | Purpose |
|------|---------|---------|
| `prisma.config.ts` | **CLI tools** (migrate, studio, db push) | Tells the CLI where your database is |
| `src/index.ts` | **Your running app** | Tells PrismaClient how to connect at runtime |

This means you provide the `DATABASE_URL` in **two places**:
- In `prisma.config.ts` → so the CLI can run migrations
- In `src/index.ts` → so your app can query data

---

## 1.3 Project Setup

### Step 1: Create & Initialize

```bash
mkdir prisma-tutorial && cd prisma-tutorial
npm init -y
```

### Step 2: Install Dependencies

```bash
# Dev dependencies
npm install -D prisma typescript ts-node @types/node

# Runtime dependencies
npm install @prisma/client @prisma/adapter-mariadb mysql2 dotenv
```

> 📝 **What's each package for?**
> - `prisma` — The CLI tool (migrations, studio, generate)
> - `@prisma/client` — The query builder you use in code
> - `@prisma/adapter-mariadb` — The adapter that connects Prisma to MySQL
> - `mysql2` — The underlying MySQL driver (the adapter uses this internally)
> - `dotenv` — Loads your `.env` file so `process.env.DATABASE_URL` works

### Step 3: Configure TypeScript

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "types": ["node"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Step 4: Initialize Prisma

```bash
npx prisma init --datasource-provider mysql
```

This creates:
- `prisma/schema.prisma` — your database schema definition
- `prisma.config.ts` — CLI configuration (for migrations, studio, etc.)
- `.env` — environment variables

### Step 5: Configure the Database URL

1. **Edit `.env`** to define your connection string:
   ```env
   # Format: mysql://USER:PASSWORD@HOST:PORT/DATABASE
   DATABASE_URL="mysql://root:your_password@localhost:3306/prisma_tutorial"
   ```

2. **Verify `prisma.config.ts`** — This file tells the Prisma CLI (migrations, studio) where your database is. It should look like:
   ```typescript
   import "dotenv/config";
   import { defineConfig } from "prisma/config";

   export default defineConfig({
     schema: "prisma/schema.prisma",
     migrations: {
       path: "prisma/migrations",
     },
     datasource: {
       url: process.env["DATABASE_URL"],
     },
   });
   ```

> 💡 **Note**: `prisma.config.ts` is only used by CLI commands (`prisma migrate`, `prisma studio`).  
> Your actual app code in `src/index.ts` connects through the **adapter** instead.

### Using Docker Compose (Recommended)
Instead of installing MySQL directly on your machine, it is much simpler to run it using Docker Compose. 

1. **Create a `docker-compose.yml`** file in the root of your project:
   ```yaml
   version: '3.8'

   services:
     mysql:
       image: mysql:8.0
       container_name: prisma-mysql
       ports:
         - "3306:3306"
       environment:
         MYSQL_ROOT_PASSWORD: your_password
         MYSQL_DATABASE: prisma_tutorial
       volumes:
         - mysql_data:/var/lib/mysql
   
   volumes:
     mysql_data:
   ```

2. **Start the database:**
   ```bash
   docker compose up -d
   ```
   *(This downloads MySQL, starts the server in the background, and automatically creates a database named `prisma_tutorial` for you!)*

3. **Verify it's running:**
   ```bash
   docker compose ps
   ```

---

## 1.4 Your First Schema

Edit `prisma/schema.prisma`:

```prisma
// This is your Prisma schema file
// Learn more: https://pris.ly/d/prisma-schema
    
generator client {
  provider = "prisma-client-ts"      // ← Prisma 7 uses "prisma-client-ts" (NOT "prisma-client-js")
  output   = "../src/generated/prisma" // ← Where to generate the client code
}

datasource db {
  provider = "mysql"
  // ⚠️ NO url here! In Prisma 7, the URL goes in prisma.config.ts (for CLI)
  //    and in your adapter (for runtime)
}

// ─── Your First Model ───────────────────────────────

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?                    // nullable field
  age       Int?
  isActive  Boolean  @default(true)
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("users")  // maps to "users" table in MySQL
}

enum Role {
  USER
  ADMIN
  MODERATOR
}
```

### Key Prisma 7 schema changes:

| Setting | Old (Prisma 5/6) | New (Prisma 7) |
|---------|-----------------|----------------|
| Generator provider | `"prisma-client-js"` | `"prisma-client-ts"` |
| Generator output | *(not needed)* | `"../src/generated/prisma"` |
| Datasource url | `url = env("DATABASE_URL")` | *(removed — handled elsewhere)* |

### Schema Syntax Explained

```prisma
model User {
  // Field     Type      Attributes
  id           Int       @id @default(autoincrement())
  //  │         │         │        └── auto-increment value
  //  │         │         └── primary key marker
  //  │         └── data type (maps to INT in MySQL)
  //  └── field name

  email        String    @unique
  //                      └── unique constraint

  name         String?
  //                  └── ? = nullable (optional)

  createdAt    DateTime  @default(now())
  //                              └── default to current timestamp

  updatedAt    DateTime  @updatedAt
  //                      └── auto-update on every save
}
```

### Common Prisma Types → MySQL Mapping

| Prisma Type | MySQL Type | Example |
|-------------|-----------|---------|
| `String` | `VARCHAR(191)` | `name String` |
| `String @db.Text` | `TEXT` | `bio String @db.Text` |
| `String @db.LongText` | `LONGTEXT` | `content String @db.LongText` |
| `Int` | `INT` | `age Int` |
| `BigInt` | `BIGINT` | `views BigInt` |
| `Float` | `DOUBLE` | `price Float` |
| `Decimal` | `DECIMAL(65,30)` | `amount Decimal` |
| `Boolean` | `TINYINT(1)` | `isActive Boolean` |
| `DateTime` | `DATETIME(3)` | `createdAt DateTime` |
| `Json` | `JSON` | `metadata Json` |

---

## 1.5 First Migration

```bash
# Create and apply migration
npx prisma migrate dev --name init

# Output:
# ✅ Created migration: 20240101000000_init
# ✅ Applied migration
# ✅ Generated Prisma Client
```

### What this does:
1. **Generates SQL** — Creates a migration file in `prisma/migrations/`
2. **Executes SQL** — Runs the SQL against your database
3. **Generates Client** — Updates the Prisma Client with your schema types

### View the generated SQL:

```sql
-- prisma/migrations/20240101000000_init/migration.sql
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `age` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `role` ENUM('USER', 'ADMIN', 'MODERATOR') NOT NULL DEFAULT 'USER',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

## 1.6 Prisma Client — Basic CRUD

Create `src/index.ts`:

```typescript
import "dotenv/config";                                 // 1️⃣ Load .env file
import { PrismaClient } from "./generated/prisma/client"; // 2️⃣ Import from generated output
import { PrismaMariaDb } from "@prisma/adapter-mariadb";  // 3️⃣ Import the adapter

// Create the adapter — this is what actually talks to MySQL
const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);

// Initialize Prisma Client WITH the adapter
const prisma = new PrismaClient({
  adapter,                                    // ← Pass the adapter here!
  log: ["query", "info", "warn", "error"],    // Enable logging
});

async function main() {
  // ═══════════════════════════════════════════
  // CREATE — Insert records
  // ═══════════════════════════════════════════

  // Clean up existing users first to allow repeated runs
  await prisma.user.deleteMany();

  // Create a single user
  const user1 = await prisma.user.create({
    data: {
      email: "alice@example.com",
      name: "Alice Johnson",
      age: 28,
      role: "ADMIN",
    },
  });
  console.log("✅ Created:", user1);

  // Create another user (minimal fields)
  const user2 = await prisma.user.create({
    data: {
      email: "bob@example.com",
      name: "Bob Smith",
    },
  });
  console.log("✅ Created:", user2);

  // Create many users at once
  const batchResult = await prisma.user.createMany({
    data: [
      { email: "charlie@example.com", name: "Charlie Brown", age: 35 },
      { email: "diana@example.com", name: "Diana Prince", age: 30, role: "MODERATOR" },
      { email: "eve@example.com", name: "Eve Davis", age: 22 },
    ],
  });
  console.log(`✅ Batch created: ${batchResult.count} users`);

  // ═══════════════════════════════════════════
  // READ — Query records
  // ═══════════════════════════════════════════

  // Find all users
  const allUsers = await prisma.user.findMany();
  console.log("📋 All users:", allUsers);

  // Find by unique field
  const alice = await prisma.user.findUnique({
    where: { email: "alice@example.com" },
  });
  console.log("🔍 Found Alice:", alice);

  // Find by ID (use the actual ID from the created user)
  const userById = await prisma.user.findUnique({
    where: { id: user1.id },
  });
  console.log("🔍 User by ID:", userById);

  // Find first match (non-unique fields)
  const firstAdmin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });
  console.log("👑 First admin:", firstAdmin);

  // Find with conditions
  const activeUsers = await prisma.user.findMany({
    where: {
      isActive: true,
      age: { gte: 25 },  // age >= 25
    },
    orderBy: { name: "asc" },
    take: 10,  // limit
    skip: 0,   // offset
  });
  console.log("📋 Active users (age ≥ 25):", activeUsers);

  // Select specific fields only
  const userEmails = await prisma.user.findMany({
    select: {
      email: true,
      name: true,
    },
  });
  console.log("📧 Emails:", userEmails);

  // ═══════════════════════════════════════════
  // UPDATE — Modify records
  // ═══════════════════════════════════════════

  // Update one record
  const updatedUser = await prisma.user.update({
    where: { email: "bob@example.com" },
    data: { age: 32, name: "Bob K. Smith" },
  });
  console.log("✏️ Updated:", updatedUser);

  // Update many records
  const deactivated = await prisma.user.updateMany({
    where: { age: { lt: 25 } },
    data: { isActive: false },
  });
  console.log(`✏️ Deactivated ${deactivated.count} users`);

  // Upsert — Update if exists, Create if not
  const upserted = await prisma.user.upsert({
    where: { email: "frank@example.com" },
    update: { name: "Frank Updated" },
    create: {
      email: "frank@example.com",
      name: "Frank New",
      age: 40,
    },
  });
  console.log("🔄 Upserted:", upserted);

  // ═══════════════════════════════════════════
  // DELETE — Remove records
  // ═══════════════════════════════════════════

  // Delete one
  const deleted = await prisma.user.delete({
    where: { email: "frank@example.com" },
  });
  console.log("🗑️ Deleted:", deleted);

  // Delete many
  const deletedMany = await prisma.user.deleteMany({
    where: { isActive: false },
  });
  console.log(`🗑️ Deleted ${deletedMany.count} inactive users`);

  // Delete ALL (careful!)
  // await prisma.user.deleteMany();

  // ═══════════════════════════════════════════
  // COUNT & AGGREGATE
  // ═══════════════════════════════════════════

  const userCount = await prisma.user.count();
  console.log("📊 Total users:", userCount);

  const countByRole = await prisma.user.count({
    where: { role: "ADMIN" },
  });
  console.log("📊 Admin count:", countByRole);
}

// Run and handle cleanup
main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### Add a run script to `package.json`:

```json
{
  "scripts": {
    "dev": "ts-node src/index.ts",
    "studio": "npx prisma studio"
  }
}
```

### Run it:

```bash
npx ts-node src/index.ts

# Or with the script
npm run dev
```

---

## 1.7 Prisma Studio — Visual Database Browser

```bash
npx prisma studio
```

This opens a **web-based GUI** at `http://localhost:5555` where you can:
- Browse all tables
- Add/edit/delete records visually
- Filter and sort data

---

## 1.8 Exercises 📝

Try these on your own before moving to Phase 2:

1. **Add a `phone` field** (optional String) to the User model and run a migration
2. **Create 10 users** with different roles using `createMany`
3. **Find all MODERATOR users** sorted by `createdAt` descending
4. **Update all users** with no age to age `25`
5. **Count users** grouped by role (hint: `groupBy`)

<details>
<summary>💡 Exercise 5 Solution</summary>

```typescript
const groupedByRole = await prisma.user.groupBy({
  by: ["role"],
  _count: { id: true },
  _avg: { age: true },
});
console.log("Grouped:", groupedByRole);
// Output: [
//   { role: 'USER', _count: { id: 3 }, _avg: { age: 25 } },
//   { role: 'ADMIN', _count: { id: 1 }, _avg: { age: 28 } },
//   ...
// ]
```
</details>

---

> **Next**: [Phase 2 — Relations & Migrations →](./phase-2-relations.md)
