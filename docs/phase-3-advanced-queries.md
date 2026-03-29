# Phase 3: Advanced Queries — Filtering, Pagination, Aggregation & Raw SQL

> 🟡 **Level**: Intermediate | ⏱ **Time**: 45 minutes

---

## 3.1 Advanced Filtering

```typescript
import { PrismaClient, Prisma } from "@prisma/client";
const prisma = new PrismaClient();

async function advancedFilters() {
  // ─── String Filters ───────────────────────
  const users = await prisma.user.findMany({
    where: {
      name: { contains: "ali" },           // LIKE '%ali%'
      // name: { startsWith: "Ali" },      // LIKE 'Ali%'
      // name: { endsWith: "son" },        // LIKE '%son'
      // name: { not: "Bob" },             // != 'Bob'
      // email: { in: ["a@b.com", "c@d.com"] },  // IN (...)
      // email: { notIn: ["x@y.com"] },    // NOT IN (...)
    },
  });

  // ─── Number Filters ──────────────────────
  const adults = await prisma.user.findMany({
    where: {
      age: {
        gte: 18,    // >= 18
        lte: 65,    // <= 65
        // gt: 18,  // > 18
        // lt: 65,  // < 65
      },
    },
  });

  // ─── Date Filters ────────────────────────
  const recentUsers = await prisma.user.findMany({
    where: {
      createdAt: {
        gte: new Date("2024-01-01"),
        lt: new Date("2025-01-01"),
      },
    },
  });

  // ─── NULL Checks ─────────────────────────
  const noProfile = await prisma.user.findMany({
    where: { profile: { is: null } },       // Users without profile
  });
  const hasProfile = await prisma.user.findMany({
    where: { profile: { isNot: null } },    // Users with profile
  });

  // ─── Combining with AND / OR / NOT ───────
  const complex = await prisma.user.findMany({
    where: {
      AND: [
        { isActive: true },
        {
          OR: [
            { role: "ADMIN" },
            { role: "MODERATOR" },
          ],
        },
        {
          NOT: { email: { contains: "test" } },
        },
      ],
    },
  });
  console.log("Complex query:", complex);
}
```

---

## 3.2 Pagination Patterns

```typescript
async function paginationExamples() {
  // ─── Offset Pagination (simple, less efficient) ───
  const page = 2;
  const pageSize = 10;

  const offsetResults = await prisma.post.findMany({
    skip: (page - 1) * pageSize,   // Skip first N
    take: pageSize,                 // Take next N
    orderBy: { createdAt: "desc" },
  });

  // Get total count for page info
  const total = await prisma.post.count();
  const totalPages = Math.ceil(total / pageSize);
  console.log(`Page ${page}/${totalPages}, Total: ${total}`);

  // ─── Cursor Pagination (efficient, for infinite scroll) ───
  const cursorResults = await prisma.post.findMany({
    take: 10,
    cursor: { id: 50 },           // Start after this record
    skip: 1,                       // Skip the cursor record itself
    orderBy: { id: "asc" },
  });

  // Next cursor = last item's ID
  const nextCursor = cursorResults[cursorResults.length - 1]?.id;
  console.log("Next cursor:", nextCursor);
}

// ─── Reusable Pagination Helper ─────────────
async function paginate<T>(
  model: any,
  args: {
    page: number;
    pageSize: number;
    where?: any;
    orderBy?: any;
    include?: any;
  }
): Promise<{
  data: T[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}> {
  const { page, pageSize, where, orderBy, include } = args;

  const [data, total] = await Promise.all([
    model.findMany({
      where,
      orderBy,
      include,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    model.count({ where }),
  ]);

  return {
    data,
    meta: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

// Usage:
// const result = await paginate(prisma.post, {
//   page: 1, pageSize: 10,
//   where: { status: "PUBLISHED" },
//   orderBy: { createdAt: "desc" },
//   include: { author: true },
// });
```

---

## 3.3 Aggregation & GroupBy

```typescript
async function aggregationExamples() {
  // ─── Aggregate: count, avg, sum, min, max ───
  const stats = await prisma.user.aggregate({
    _count: { id: true },
    _avg: { age: true },
    _min: { age: true },
    _max: { age: true },
    _sum: { age: true },
    where: { isActive: true },
  });
  console.log("📊 Stats:", stats);
  // { _count: { id: 42 }, _avg: { age: 29.5 }, _min: { age: 18 }, ... }

  // ─── GroupBy: aggregate per group ───
  const byRole = await prisma.user.groupBy({
    by: ["role"],
    _count: { id: true },
    _avg: { age: true },
    orderBy: { _count: { id: "desc" } },
  });
  console.log("📊 By role:", byRole);
  // [
  //   { role: 'USER', _count: { id: 25 }, _avg: { age: 28 } },
  //   { role: 'ADMIN', _count: { id: 10 }, _avg: { age: 34 } },
  // ]

  // ─── GroupBy with HAVING ───
  const activeRoles = await prisma.user.groupBy({
    by: ["role"],
    _count: { id: true },
    having: {
      id: { _count: { gt: 5 } },      // Only roles with > 5 users
    },
  });

  // ─── Count relations ───
  const usersWithCounts = await prisma.user.findMany({
    include: {
      _count: {
        select: {
          posts: true,
          comments: true,
        },
      },
    },
    orderBy: {
      posts: { _count: "desc" },       // Order by post count
    },
  });
}
```

---

## 3.4 Sorting & Selecting

```typescript
async function sortingAndSelecting() {
  // ─── Multi-field sorting ───
  const sorted = await prisma.post.findMany({
    orderBy: [
      { status: "asc" },
      { views: "desc" },
      { createdAt: "desc" },
    ],
  });

  // ─── Sort by relation ───
  const usersSortedByPostCount = await prisma.user.findMany({
    orderBy: { posts: { _count: "desc" } },
    include: { _count: { select: { posts: true } } },
  });

  // ─── Null ordering ───
  const nullsFirst = await prisma.user.findMany({
    orderBy: { age: { sort: "asc", nulls: "first" } },
  });

  // ─── Select vs Include ───
  // select: cherry-pick fields (smaller payload)
  const lean = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      posts: {
        select: { title: true, status: true },
        where: { status: "PUBLISHED" },
      },
    },
  });

  // ─── Distinct ───
  const uniqueRoles = await prisma.user.findMany({
    distinct: ["role"],
    select: { role: true },
  });
}
```

---

## 3.5 Raw SQL Queries

```typescript
async function rawSqlExamples() {
  // ─── Raw query (SELECT) ───
  const users = await prisma.$queryRaw`
    SELECT u.id, u.name, COUNT(p.id) as post_count
    FROM users u
    LEFT JOIN posts p ON p.authorId = u.id
    GROUP BY u.id, u.name
    ORDER BY post_count DESC
    LIMIT 10
  `;
  console.log("Top authors:", users);

  // ─── With parameters (safe from SQL injection) ───
  const role = "ADMIN";
  const minAge = 25;
  const admins = await prisma.$queryRaw`
    SELECT * FROM users
    WHERE role = ${role} AND age >= ${minAge}
  `;

  // ─── Raw execute (INSERT, UPDATE, DELETE) ───
  const result = await prisma.$executeRaw`
    UPDATE users SET isActive = false
    WHERE createdAt < DATE_SUB(NOW(), INTERVAL 1 YEAR)
  `;
  console.log(`Deactivated ${result} users`);

  // ─── Using Prisma.sql for dynamic queries ───
  const columns = Prisma.sql`id, name, email`;
  const table = Prisma.sql`users`;
  const dynamicQuery = await prisma.$queryRaw`
    SELECT ${columns} FROM ${table} WHERE isActive = true
  `;

  // ─── Raw query with typed results ───
  interface UserPostCount {
    id: number;
    name: string;
    post_count: bigint;
  }

  const typed = await prisma.$queryRaw<UserPostCount[]>`
    SELECT u.id, u.name, COUNT(p.id) as post_count
    FROM users u
    LEFT JOIN posts p ON p.authorId = u.id
    GROUP BY u.id, u.name
  `;
  typed.forEach((u) => console.log(`${u.name}: ${u.post_count} posts`));
}
```

---

## 3.6 Exercises 📝

1. Write a query to find the **top 5 most viewed published posts** with author name and tag names
2. Implement **cursor-based pagination** for posts, returning `nextCursor` and `hasMore`
3. Get the **average number of comments per post**, grouped by post status
4. Write a **raw SQL query** to find users who registered in the last 30 days and have at least 2 posts

---

> **Next**: [Phase 4 — Production Patterns →](./phase-4-production.md)
