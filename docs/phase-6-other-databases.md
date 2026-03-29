# Phase 6: Other Databases — PostgreSQL, SQLite, MongoDB & CockroachDB

> 🟡 **Level**: Mixed | ⏱ **Time**: 30 minutes

Prisma supports multiple databases. Here's how each one differs from MySQL.

---

## 6.1 Quick Comparison

| Feature | MySQL | PostgreSQL | SQLite | MongoDB |
|---------|-------|------------|--------|---------|
| **Provider** | `mysql` | `postgresql` | `sqlite` | `mongodb` |
| **URL format** | `mysql://user:pass@host/db` | `postgresql://user:pass@host/db` | `file:./dev.db` | `mongodb+srv://...` |
| **Full-text search** | ✅ | ✅ (better) | ❌ | ✅ (Atlas) |
| **JSON support** | ✅ | ✅ (richer) | ❌ | ✅ (native) |
| **Enums** | Native | Native | Emulated | Emulated |
| **Array fields** | ❌ | ✅ | ❌ | ✅ |
| **Auto-increment** | ✅ | ✅ (serial) | ✅ | ❌ (uses ObjectId) |
| **Best for** | Web apps | Complex apps | Prototyping/Edge | Document data |

---

## 6.2 PostgreSQL Example

### Setup

```bash
npx prisma init --datasource-provider postgresql
```

### `.env`

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/myapp?schema=public"
```

### PostgreSQL-Specific Features

```prisma
datasource db {
  provider = "postgresql"
  // URL is configured in prisma.config.ts (for CLI) and via the adapter (for runtime)
}

model Product {
  id          Int      @id @default(autoincrement())
  name        String
  description String?
  price       Decimal  @db.Decimal(10, 2)
  tags        String[]                     // ← PostgreSQL array type!
  metadata    Json?
  searchVector Unsupported("tsvector")?    // ← Full-text search

  @@index([tags], type: Gin)               // ← GIN index for arrays
  @@map("products")
}

model Event {
  id        Int      @id @default(autoincrement())
  name      String
  startTime DateTime @db.Timestamptz        // ← Timezone-aware timestamp
  location  Unsupported("point")?           // ← PostGIS geospatial
}
```

### PostgreSQL-Specific Queries

```typescript
// Array field operations
const products = await prisma.product.findMany({
  where: {
    tags: { has: "electronics" },           // Array contains
    // tags: { hasEvery: ["a", "b"] },      // Contains all
    // tags: { hasSome: ["a", "b"] },       // Contains any
    // tags: { isEmpty: true },             // Empty array
  },
});

// Full-text search via raw SQL
const results = await prisma.$queryRaw`
  SELECT * FROM products
  WHERE to_tsvector('english', name || ' ' || COALESCE(description, ''))
  @@ plainto_tsquery('english', ${searchTerm})
`;
```

> 📦 **Prisma 7 Adapter**: Use `@prisma/adapter-pg` with the `PrismaPg` class for PostgreSQL.

---

## 6.3 SQLite Example

Perfect for prototyping, CLI tools, mobile apps, or edge environments.

### Setup

```bash
npx prisma init --datasource-provider sqlite
```

### `.env`

```env
DATABASE_URL="file:./dev.db"
```

### Schema

```prisma
datasource db {
  provider = "sqlite"
  // URL is configured in prisma.config.ts (for CLI) and via the adapter (for runtime)
}

model Todo {
  id          Int      @id @default(autoincrement())
  title       String
  description String?
  completed   Boolean  @default(false)
  priority    Int      @default(0)    // No enums in SQLite
  dueDate     DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  listId      Int
  list        TodoList @relation(fields: [listId], references: [id])
}

model TodoList {
  id    Int    @id @default(autoincrement())
  name  String
  color String @default("#6366f1")
  todos Todo[]
}
```

> **SQLite gotchas:**
> - No `enum` support (use `Int` or `String` instead)
> - No `@db.Text`, `@db.VarChar` etc.
> - Auto-increment is the default for `@id`
> - File-based — the whole DB is a single `.db` file

> 📦 **Prisma 7 Adapter**: Use `@prisma/adapter-libsql` with the `PrismaLibSQL` class for SQLite.

---

## 6.4 MongoDB Example

Prisma supports MongoDB for document-oriented data.

### Setup

```bash
npx prisma init --datasource-provider mongodb
```

### `.env`

```env
DATABASE_URL="mongodb+srv://user:pass@cluster.mongodb.net/mydb?retryWrites=true&w=majority"
```

### Schema (note key differences)

```prisma
datasource db {
  provider = "mongodb"
  // URL is configured in prisma.config.ts (for CLI) and via the adapter (for runtime)
}

generator client {
  provider = "prisma-client-ts"
  output   = "../src/generated/prisma"
}

model User {
  id       String   @id @default(auto()) @map("_id") @db.ObjectId  // ObjectId!
  email    String   @unique
  name     String?
  profile  Profile?                     // Embedded document
  posts    Post[]
}

// Embedded type (not a separate collection)
type Profile {
  bio      String?
  avatar   String?
  website  String?
  social   SocialLinks?
}

type SocialLinks {
  twitter  String?
  github   String?
  linkedin String?
}

model Post {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  title     String
  content   String?
  tags      String[]                    // Array field
  metadata  Json?                       // Flexible JSON
  published Boolean  @default(false)

  authorId  String   @db.ObjectId
  author    User     @relation(fields: [authorId], references: [id])

  comments  Comment[]                   // Embedded documents array
}

type Comment {
  text      String
  authorName String
  createdAt DateTime @default(now())
}
```

### MongoDB-Specific Queries

```typescript
// Embedded document filtering
const users = await prisma.user.findMany({
  where: {
    profile: {
      is: { bio: { contains: "developer" } },
    },
  },
});

// Array operations (same as PostgreSQL)
const tagged = await prisma.post.findMany({
  where: {
    tags: { hasSome: ["prisma", "typescript"] },
  },
});

// Composite types — create with embedded 
const user = await prisma.user.create({
  data: {
    email: "test@mongo.com",
    name: "Mongo User",
    profile: {                          // Embedded, not a relation!
      bio: "MongoDB enthusiast",
      social: {
        github: "mongouser",
      },
    },
  },
});
```

> **MongoDB key differences:**
> - Uses `String @id @default(auto()) @map("_id") @db.ObjectId` instead of `Int @id @default(autoincrement())`
> - `type` keyword for embedded documents (not `model`)
> - No `@@map` for collections (use `@@map` on `model` only)
> - No migration system — use `prisma db push` only
> - No `autoincrement()` — use `auto()` for ObjectIds

---

## 6.5 CockroachDB Example

Distributed SQL — compatible with PostgreSQL but globally distributed.

```prisma
datasource db {
  provider = "cockroachdb"
  // URL is configured in prisma.config.ts (for CLI) and via the adapter (for runtime)
}

model User {
  id    BigInt @id @default(sequence())   // CockroachDB sequences
  email String @unique
  name  String?
}
```

```env
DATABASE_URL="postgresql://user:pass@localhost:26257/mydb?sslmode=verify-full"
```

---

## 6.6 Multi-Database Quick Switch

Switching databases in Prisma is mostly a **3-step process**:

```bash
# 1. Change provider in schema.prisma
# datasource db { provider = "postgresql" }

# 2. Update DATABASE_URL in .env

# 3. Push schema
npx prisma db push
```

> ⚠️ **Not everything is portable**: Array fields (PostgreSQL), embedded types (MongoDB), and some `@db.*` attributes are provider-specific.

---

> **Next**: [Phase 7 — Cheat Sheet & Best Practices →](./phase-7-cheatsheet.md)
