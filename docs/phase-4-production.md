# Phase 4: Production Patterns — Transactions, Middleware, Seeding & Soft Delete

> 🔴 **Level**: Advanced | ⏱ **Time**: 60 minutes

---

## 4.1 Transactions

### Interactive Transactions

```typescript
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// ─── Transfer credits between users (must be atomic) ───
async function transferCredits(fromId: number, toId: number, amount: number) {
  const result = await prisma.$transaction(async (tx) => {
    // 1. Deduct from sender
    const sender = await tx.user.update({
      where: { id: fromId },
      data: { credits: { decrement: amount } },
    });

    // 2. Verify sender has enough
    if (sender.credits < 0) {
      throw new Error("Insufficient credits"); // Rolls back everything
    }

    // 3. Add to receiver
    const receiver = await tx.user.update({
      where: { id: toId },
      data: { credits: { increment: amount } },
    });

    // 4. Log the transaction
    const log = await tx.transactionLog.create({
      data: {
        fromUserId: fromId,
        toUserId: toId,
        amount,
        type: "TRANSFER",
      },
    });

    return { sender, receiver, log };
  });

  return result;
}

// ─── Transaction with timeout and retry ───
async function robustTransaction() {
  return prisma.$transaction(
    async (tx) => {
      // ... your operations
    },
    {
      maxWait: 5000,     // Max time to acquire a DB connection (ms)
      timeout: 10000,    // Max time for the transaction (ms)
      isolationLevel: "Serializable", // ReadCommitted | RepeatableRead | Serializable
    }
  );
}
```

### Batch Transactions

```typescript
// Multiple operations as a single transaction (all-or-nothing)
async function batchOps() {
  const [updatedUser, newPost, deletedComments] = await prisma.$transaction([
    prisma.user.update({
      where: { id: 1 },
      data: { name: "Updated Name" },
    }),
    prisma.post.create({
      data: { title: "New Post", slug: "new-post", authorId: 1 },
    }),
    prisma.comment.deleteMany({
      where: { userId: 1 },
    }),
  ]);
}
```

---

## 4.2 Middleware & Extensions

### Prisma Client Extensions (recommended over deprecated middleware)

```typescript
// ─── Soft Delete Extension ───
const xprisma = prisma.$extends({
  query: {
    user: {
      // Override delete to soft-delete
      async delete({ args, query }) {
        return prisma.user.update({
          ...args,
          data: { deletedAt: new Date() },
        });
      },
      // Override findMany to exclude soft-deleted
      async findMany({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
    },
  },
});

// Usage:
// await xprisma.user.delete({ where: { id: 1 } });
// → Sets deletedAt instead of actual delete
// await xprisma.user.findMany();
// → Only returns non-deleted users

// ─── Logging Extension ───
const loggedPrisma = prisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const start = performance.now();
        const result = await query(args);
        const duration = performance.now() - start;
        console.log(`[${model}.${operation}] ${duration.toFixed(2)}ms`);
        return result;
      },
    },
  },
});

// ─── Computed Fields Extension ───
const enrichedPrisma = prisma.$extends({
  result: {
    user: {
      fullDisplayName: {
        needs: { name: true, email: true },
        compute(user) {
          return user.name ?? user.email.split("@")[0];
        },
      },
    },
    post: {
      excerpt: {
        needs: { content: true },
        compute(post) {
          return post.content?.substring(0, 150) + "..." ?? "";
        },
      },
    },
  },
});

// Usage:
// const user = await enrichedPrisma.user.findFirst();
// console.log(user.fullDisplayName); // ← computed field!
```

---

## 4.3 Database Seeding

Create `prisma/seed.ts`:

```typescript
import { PrismaClient, Role, PostStatus } from "@prisma/client";
const prisma = new PrismaClient();

async function seed() {
  console.log("🌱 Seeding database...");

  // Clean existing data (in dependency order)
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.user.deleteMany();

  // ── Create Tags ──
  const tags = await Promise.all(
    ["TypeScript", "Prisma", "MySQL", "Docker", "Node.js", "React"].map(
      (name) => prisma.tag.create({ data: { name } })
    )
  );

  // ── Create Users with Profiles ──
  const alice = await prisma.user.create({
    data: {
      email: "alice@example.com",
      name: "Alice Johnson",
      age: 28,
      role: "ADMIN",
      profile: {
        create: { bio: "Full-stack dev", website: "https://alice.dev" },
      },
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: "bob@example.com",
      name: "Bob Smith",
      age: 34,
      role: "MODERATOR",
      profile: {
        create: { bio: "Backend engineer", location: "NYC" },
      },
    },
  });

  const users = [alice, bob];

  // Create more regular users
  for (let i = 1; i <= 10; i++) {
    const user = await prisma.user.create({
      data: {
        email: `user${i}@example.com`,
        name: `User ${i}`,
        age: 20 + i,
      },
    });
    users.push(user);
  }

  // ── Create Posts with Tags ──
  const postData = [
    { title: "Getting Started with Prisma", slug: "prisma-start", status: "PUBLISHED" as PostStatus, tagNames: ["Prisma", "TypeScript"] },
    { title: "MySQL Performance Tips", slug: "mysql-perf", status: "PUBLISHED" as PostStatus, tagNames: ["MySQL", "Prisma"] },
    { title: "Docker for Databases", slug: "docker-db", status: "DRAFT" as PostStatus, tagNames: ["Docker", "MySQL"] },
    { title: "Building REST APIs", slug: "rest-apis", status: "PUBLISHED" as PostStatus, tagNames: ["Node.js", "TypeScript"] },
  ];

  for (const pd of postData) {
    const author = users[Math.floor(Math.random() * 2)]; // Alice or Bob
    await prisma.post.create({
      data: {
        title: pd.title,
        slug: pd.slug,
        content: `Content for ${pd.title}...`,
        status: pd.status,
        authorId: author.id,
        tags: {
          connect: pd.tagNames.map((name) => ({ name })),
        },
      },
    });
  }

  // ── Create Comments ──
  const posts = await prisma.post.findMany();
  for (const post of posts) {
    for (let i = 0; i < 3; i++) {
      const commenter = users[Math.floor(Math.random() * users.length)];
      await prisma.comment.create({
        data: {
          text: `Great post about ${post.title}! Comment #${i + 1}`,
          postId: post.id,
          userId: commenter.id,
        },
      });
    }
  }

  const counts = {
    users: await prisma.user.count(),
    posts: await prisma.post.count(),
    comments: await prisma.comment.count(),
    tags: await prisma.tag.count(),
  };
  console.log("✅ Seeding complete:", counts);
}

seed()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

Add to `package.json`:

```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

Run the seed:

```bash
npx prisma db seed
# or automatically on migrate reset:
npx prisma migrate reset
```

---

## 4.4 Singleton Pattern (Best Practice)

Create `src/db.ts` — use ONE Prisma Client instance across your app:

```typescript
import { PrismaClient } from "@prisma/client";

// Prevent multiple instances during hot-reload in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
```

Usage everywhere:

```typescript
import prisma from "./db";

const users = await prisma.user.findMany();
```

---

## 4.5 Error Handling

```typescript
import { Prisma } from "@prisma/client";

async function handleErrors() {
  try {
    await prisma.user.create({
      data: { email: "duplicate@test.com", name: "Test" },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case "P2002":
          // Unique constraint violation
          const field = (error.meta?.target as string[])?.join(", ");
          console.error(`Duplicate value for: ${field}`);
          break;
        case "P2025":
          // Record not found
          console.error("Record not found");
          break;
        case "P2003":
          // Foreign key constraint failure
          console.error("Related record not found");
          break;
        default:
          console.error(`Database error [${error.code}]:`, error.message);
      }
    } else if (error instanceof Prisma.PrismaClientValidationError) {
      console.error("Validation error:", error.message);
    } else {
      throw error; // Re-throw unknown errors
    }
  }
}
```

### Common Prisma Error Codes

| Code | Meaning |
|------|---------|
| `P2002` | Unique constraint violation |
| `P2003` | Foreign key constraint failure |
| `P2025` | Record not found (update/delete) |
| `P2014` | Required relation violation |
| `P2000` | Value too long for column |
| `P2021` | Table does not exist |
| `P2022` | Column does not exist |

---

## 4.6 Exercises 📝

1. Implement a **transfer credits** function with proper balance checking in a transaction
2. Create an extension that **auto-generates slugs** from post titles on create
3. Write a comprehensive **seed script** with at least 50 users and random data
4. Implement proper **error handling** that returns user-friendly error messages

---

> **Next**: [Phase 5 — Real-World Projects →](./phase-5-projects.md)
