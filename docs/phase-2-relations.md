# Phase 2: Relations & Migrations

> 🟡 **Level**: Intermediate | ⏱ **Time**: 45-60 minutes

---

## 2.1 Understanding Relations

Prisma supports three types of relations:

```
┌─────────────┐     ┌─────────────┐
│   User      │     │   Profile   │
│             │ 1:1 │             │
│  id ────────┼─────┤ userId (FK) │
└─────────────┘     └─────────────┘

┌─────────────┐     ┌─────────────┐
│   User      │     │   Post      │
│             │ 1:N │             │
│  id ────────┼─────┤ authorId    │
└─────────────┘     └─────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Post      │     │ _PostTags   │     │   Tag       │
│             │ M:N │ (junction)  │ M:N │             │
│  id ────────┼─────┤ postId      │     │             │
│             │     │ tagId ──────┼─────┤ id          │
└─────────────┘     └─────────────┘     └─────────────┘
```

---

## 2.2 Complete Schema with All Relation Types

Update `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-ts"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "mysql"
  // URL is configured in prisma.config.ts (for CLI) and via the adapter (for runtime)
}

// ─── ENUMS ──────────────────────────────────

enum Role {
  USER
  ADMIN
  MODERATOR
}

enum PostStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

// ─── MODELS ─────────────────────────────────

model User {
  id        Int       @id @default(autoincrement())
  email     String    @unique
  name      String?
  age       Int?
  isActive  Boolean   @default(true)
  role      Role      @default(USER)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  // ── Relations ──
  profile   Profile?           // 1:1 — User has one Profile
  posts     Post[]             // 1:N — User has many Posts
  comments  Comment[]          // 1:N — User has many Comments

  @@map("users")
}

// ─── ONE-TO-ONE ─────────────────────────────

model Profile {
  id       Int     @id @default(autoincrement())
  bio      String? @db.Text
  avatar   String?
  website  String?
  location String?

  // ── Relation back to User ──
  userId   Int     @unique        // FK + unique = 1:1
  user     User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("profiles")
}

// ─── ONE-TO-MANY ────────────────────────────

model Post {
  id        Int        @id @default(autoincrement())
  title     String     @db.VarChar(255)
  content   String?    @db.LongText
  slug      String     @unique
  status    PostStatus @default(DRAFT)
  views     Int        @default(0)
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  // ── Relations ──
  authorId  Int                          // FK to User
  author    User      @relation(fields: [authorId], references: [id], onDelete: Cascade)
  comments  Comment[]                    // 1:N — Post has many Comments
  tags      Tag[]                        // M:N — implicit relation

  // ── Indexes ──
  @@index([authorId])
  @@index([status])
  @@map("posts")
}

model Comment {
  id        Int      @id @default(autoincrement())
  text      String   @db.Text
  createdAt DateTime @default(now())

  // ── Relations ──
  postId    Int
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  userId    Int
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([postId])
  @@index([userId])
  @@map("comments")
}

// ─── MANY-TO-MANY (Implicit) ────────────────

model Tag {
  id    Int    @id @default(autoincrement())
  name  String @unique
  posts Post[]                             // M:N — implicit junction table

  @@map("tags")
}
```

### Apply the migration:

```bash
npx prisma migrate dev --name add-relations
```

---

## 2.3 Relation Queries

Create `src/relations.ts`:

```typescript
import "dotenv/config";
import { PrismaClient } from "./generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  // ═══════════════════════════════════════════
  // 1:1 — Create User + Profile together
  // ═══════════════════════════════════════════

  const userWithProfile = await prisma.user.create({
    data: {
      email: "alice@blog.com",
      name: "Alice",
      role: "ADMIN",
      profile: {
        create: {                         // Nested create
          bio: "Full-stack developer & blogger",
          website: "https://alice.dev",
          location: "San Francisco",
        },
      },
    },
    include: { profile: true },           // Include related Profile
  });
  console.log("👤 User + Profile:", userWithProfile);

  // ═══════════════════════════════════════════
  // 1:N — Create User with Posts
  // ═══════════════════════════════════════════

  const authorWithPosts = await prisma.user.create({
    data: {
      email: "bob@blog.com",
      name: "Bob",
      posts: {
        create: [
          {
            title: "Getting Started with Prisma",
            slug: "getting-started-prisma",
            content: "Prisma is amazing...",
            status: "PUBLISHED",
          },
          {
            title: "Advanced TypeScript Tips",
            slug: "advanced-typescript-tips",
            content: "Here are some tips...",
            status: "DRAFT",
          },
        ],
      },
    },
    include: {
      posts: true,
    },
  });
  console.log("📝 Author + Posts:", authorWithPosts);

  // ═══════════════════════════════════════════
  // M:N — Create Post with Tags
  // ═══════════════════════════════════════════

  const postWithTags = await prisma.post.create({
    data: {
      title: "MySQL Performance Tuning",
      slug: "mysql-performance",
      content: "Let's optimize...",
      status: "PUBLISHED",
      author: { connect: { email: "alice@blog.com" } },  // Connect existing
      tags: {
        connectOrCreate: [
          {
            where: { name: "mysql" },
            create: { name: "mysql" },
          },
          {
            where: { name: "performance" },
            create: { name: "performance" },
          },
          {
            where: { name: "database" },
            create: { name: "database" },
          },
        ],
      },
    },
    include: { tags: true, author: true },
  });
  console.log("🏷️ Post + Tags:", postWithTags);

  // ═══════════════════════════════════════════
  // DEEP INCLUDES — Nested relation loading
  // ═══════════════════════════════════════════

  const fullUser = await prisma.user.findUnique({
    where: { email: "alice@blog.com" },
    include: {
      profile: true,
      posts: {
        include: {
          tags: true,
          comments: {
            include: { user: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  console.log("🌳 Full user tree:", JSON.stringify(fullUser, null, 2));

  // ═══════════════════════════════════════════
  // RELATION FILTERS — Query through relations
  // ═══════════════════════════════════════════

  // Find users who have at least one published post
  const publishedAuthors = await prisma.user.findMany({
    where: {
      posts: {
        some: { status: "PUBLISHED" },      // At least one match
      },
    },
    include: {
      _count: { select: { posts: true } },  // Include post count
    },
  });
  console.log("✍️ Published authors:", publishedAuthors);

  // Find users with NO posts
  const lurkers = await prisma.user.findMany({
    where: {
      posts: { none: {} },                  // No posts at all
    },
  });
  console.log("👻 Lurkers:", lurkers);

  // Find users where ALL posts are published
  const prolific = await prisma.user.findMany({
    where: {
      posts: {
        every: { status: "PUBLISHED" },     // All posts match
      },
    },
  });
  console.log("🌟 All-published authors:", prolific);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

---

## 2.4 Migration Workflow

### Migration Commands Reference

```bash
# Create & apply migration (development)
npx prisma migrate dev --name descriptive_name

# Apply pending migrations (production)
npx prisma migrate deploy

# Reset database (drops all data!)
npx prisma migrate reset

# Check migration status
npx prisma migrate status

# Generate client without migrating
npx prisma generate

# Pull existing DB schema into schema.prisma
npx prisma db pull

# Push schema directly (no migration file — prototyping only)
npx prisma db push
```

### Migration Best Practices

| ✅ Do | ❌ Don't |
|-------|----------|
| Use `migrate dev` in development | Use `db push` in production |
| Give descriptive migration names | Name migrations "update" or "fix" |
| Review generated SQL before deploying | Blindly apply migrations |
| Commit migration files to Git | Add `prisma/migrations/` to `.gitignore` |
| Use `migrate deploy` in CI/CD | Use `migrate dev` in production |

### Handling Schema Changes

```bash
# Example: Add a 'phone' field to User
# 1. Edit schema.prisma: add `phone String?`
# 2. Run migration:
npx prisma migrate dev --name add_user_phone

# Example: Rename a field (requires custom SQL)
# 1. Create empty migration:
npx prisma migrate dev --create-only --name rename_field
# 2. Edit the generated SQL file manually
# 3. Apply: npx prisma migrate dev
```

---

## 2.5 Exercises 📝

1. Add a `Category` model with a 1:N relation to `Post` (a post belongs to one category)
2. Create a self-relation: `User` can follow other `User`s (M:N with explicit junction table)
3. Query all posts with their author name, category name, and tag names
4. Find the user with the most published posts

<details>
<summary>💡 Exercise 2 — Self-relation solution</summary>

```prisma
model User {
  // ... existing fields ...
  followers  Follow[] @relation("following")
  following  Follow[] @relation("followers")
}

model Follow {
  id          Int  @id @default(autoincrement())
  followerId  Int
  followingId Int
  follower    User @relation("followers", fields: [followerId], references: [id])
  following   User @relation("following", fields: [followingId], references: [id])

  @@unique([followerId, followingId])
  @@map("follows")
}
```
</details>

---

> **Next**: [Phase 3 — Advanced Queries →](./phase-3-advanced-queries.md)
