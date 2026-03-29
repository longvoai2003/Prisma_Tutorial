# Phase 7: Cheat Sheet & Best Practices

> 📋 **Quick Reference** — Bookmark this page!

---

## 7.1 CLI Commands Cheat Sheet

```bash
# ─── Setup ────────────────────────────────────
npx prisma init                           # Initialize Prisma (default: PostgreSQL)
npx prisma init --datasource-provider mysql  # Initialize with MySQL
npx prisma generate                       # Regenerate Prisma Client

# ─── Migrations ───────────────────────────────
npx prisma migrate dev --name <name>      # Create & apply migration (dev)
npx prisma migrate deploy                 # Apply pending migrations (prod)
npx prisma migrate reset                  # Reset DB + re-apply all + seed
npx prisma migrate status                 # Check migration status
npx prisma migrate dev --create-only      # Create migration without applying

# ─── Database ────────────────────────────────
npx prisma db push                        # Push schema without migration file
npx prisma db pull                        # Introspect existing DB → schema
npx prisma db seed                        # Run seed script

# ─── Tools ────────────────────────────────────
npx prisma studio                         # Visual DB browser (port 5555)
npx prisma validate                       # Validate schema syntax
npx prisma format                         # Format schema file
```

---

## 7.2 Query Cheat Sheet

### CRUD Operations

```typescript
// CREATE
prisma.user.create({ data: { ... } })
prisma.user.createMany({ data: [...], skipDuplicates: true })

// READ
prisma.user.findUnique({ where: { id: 1 } })        // By unique field
prisma.user.findFirst({ where: { ... } })             // First match
prisma.user.findMany({ where: { ... } })              // All matches
prisma.user.findUniqueOrThrow({ where: { id: 1 } })  // Throws if not found

// UPDATE
prisma.user.update({ where: { id: 1 }, data: { ... } })
prisma.user.updateMany({ where: { ... }, data: { ... } })
prisma.user.upsert({ where: { ... }, create: { ... }, update: { ... } })

// DELETE
prisma.user.delete({ where: { id: 1 } })
prisma.user.deleteMany({ where: { ... } })

// COUNT & AGGREGATE
prisma.user.count({ where: { ... } })
prisma.user.aggregate({ _avg: { age: true }, _count: true })
prisma.user.groupBy({ by: ["role"], _count: { id: true } })
```

### Filtering

```typescript
// ── Comparison ──
{ age: { equals: 25 } }          // =
{ age: { not: 25 } }             // !=
{ age: { gt: 25 } }              // >
{ age: { gte: 25 } }             // >=
{ age: { lt: 25 } }              // <
{ age: { lte: 25 } }             // <=

// ── String ──
{ name: { contains: "john" } }    // LIKE '%john%'
{ name: { startsWith: "J" } }     // LIKE 'J%'
{ name: { endsWith: "son" } }     // LIKE '%son'

// ── List ──
{ id: { in: [1, 2, 3] } }         // IN (1, 2, 3)
{ id: { notIn: [4, 5] } }         // NOT IN (4, 5)

// ── Logic ──
{ AND: [{ ... }, { ... }] }
{ OR: [{ ... }, { ... }] }
{ NOT: { ... } }

// ── Relations ──
{ posts: { some: { status: "PUBLISHED" } } }   // Has at least one
{ posts: { every: { status: "PUBLISHED" } } }  // All match
{ posts: { none: { status: "DRAFT" } } }       // None match
{ profile: { is: null } }                       // No related record
{ profile: { isNot: null } }                    // Has related record
```

### Relations

```typescript
// Include related data
include: { posts: true, profile: true }

// Nested include
include: {
  posts: {
    include: { tags: true },
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    take: 5,
  }
}

// Select specific fields
select: { id: true, name: true, posts: { select: { title: true } } }

// Count relations
include: { _count: { select: { posts: true, comments: true } } }

// Nested writes
data: {
  profile: { create: { ... } }            // Create related
  posts: { connect: { id: 1 } }           // Connect existing
  tags: { connectOrCreate: { where: { ... }, create: { ... } } }
  comments: { disconnect: { id: 1 } }     // Remove link
}
```

### Pagination & Sorting

```typescript
// Offset pagination
{ skip: 20, take: 10 }

// Cursor pagination
{ cursor: { id: 50 }, skip: 1, take: 10 }

// Sorting
orderBy: { createdAt: "desc" }
orderBy: [{ role: "asc" }, { name: "desc" }]
orderBy: { posts: { _count: "desc" } }
```

---

## 7.3 Schema Cheat Sheet

### Field Attributes

```prisma
@id                           // Primary key
@default(autoincrement())     // Auto-increment (MySQL/PostgreSQL)
@default(uuid())              // UUID string
@default(cuid())              // CUID string
@default(now())               // Current timestamp
@default(dbgenerated("..."))  // DB-generated expression

@unique                       // Unique constraint
@updatedAt                    // Auto-update timestamp
@map("column_name")           // Map to different column name

@db.VarChar(255)              // Specific DB type
@db.Text                      // TEXT type
@db.LongText                  // LONGTEXT (MySQL)
@db.Decimal(10, 2)            // DECIMAL with precision

@relation(fields: [...], references: [...])           // Define relation
@relation(fields: [...], references: [...], onDelete: Cascade)  // With cascade
```

### Model Attributes

```prisma
@@map("table_name")                          // Map to table name
@@unique([field1, field2])                   // Composite unique
@@index([field1, field2])                    // Composite index
@@id([field1, field2])                       // Composite primary key
@@index([title], type: FullText)             // Full-text index (MySQL)
```

---

## 7.4 Best Practices

### ✅ Do's

| Practice | Example |
|----------|---------|
| **Use singleton pattern** | See Phase 4, `src/db.ts` |
| **Always disconnect** | `finally { await prisma.$disconnect() }` |
| **Use `select` for performance** | Only fetch needed fields |
| **Add indexes** for frequent queries | `@@index([authorId])` |
| **Use transactions** for multi-step ops | `prisma.$transaction(...)` |
| **Handle errors** by error code | `P2002`, `P2025`, etc. |
| **Commit migration files** to Git | `prisma/migrations/` |
| **Use `migrate dev`** in development | Creates migration history |
| **Use `migrate deploy`** in production | Applies without prompt |
| **Seed data** via `prisma/seed.ts` | Add to `package.json` prisma config |

### ❌ Don'ts

| Anti-Pattern | Instead |
|-------------|---------|
| `db push` in production | Use `migrate deploy` |
| `deleteMany()` without `where` | Always specify conditions |
| `include` with deep nesting | Use `select` to limit fields |
| Creating multiple Prisma Client instances | Use singleton pattern |
| Storing passwords in plain text | Use `bcrypt` before storing |
| Ignoring the `_count` feature | Use it instead of fetching all related records |

---

## 7.5 Performance Tips

```typescript
// ❌ N+1 Problem — fetching relations in a loop
const users = await prisma.user.findMany();
for (const user of users) {
  const posts = await prisma.post.findMany({ where: { authorId: user.id } });
  // This makes N+1 queries!
}

// ✅ Solution — include or select
const users = await prisma.user.findMany({
  include: { posts: true },  // Single query with JOIN
});

// ✅ Use _count instead of fetching all
const users = await prisma.user.findMany({
  include: { _count: { select: { posts: true } } },
});

// ✅ Batch operations — one query instead of N
await prisma.user.updateMany({
  where: { id: { in: [1, 2, 3] } },
  data: { isActive: false },
});

// ✅ Select only what you need
const emails = await prisma.user.findMany({
  select: { email: true },  // Much lighter than fetching all fields
});
```

---

## 7.6 Project Checklist

Use this when starting a new Prisma + MySQL project:

- [ ] `npm init -y` & install dependencies
- [ ] `npx prisma init --datasource-provider mysql`
- [ ] Configure `DATABASE_URL` in `.env`
- [ ] Add `.env` to `.gitignore`
- [ ] Design schema in `prisma/schema.prisma`
- [ ] Run `npx prisma migrate dev --name init`
- [ ] Create `src/db.ts` with singleton pattern
- [ ] Create `prisma/seed.ts` with test data
- [ ] Add seed config to `package.json`
- [ ] Install Prisma VS Code extension
- [ ] Set up error handling with Prisma error codes
- [ ] Add indexes for frequently queried fields

---

## 📚 Resources

| Resource | Link |
|----------|------|
| Prisma Docs | https://www.prisma.io/docs |
| Prisma Client API | https://www.prisma.io/docs/reference/api-reference/prisma-client-reference |
| Schema Reference | https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference |
| Error Codes | https://www.prisma.io/docs/reference/api-reference/error-reference |
| Prisma Examples | https://github.com/prisma/prisma-examples |
| Prisma Discord | https://pris.ly/discord |

---

> 🎉 **Congratulations!** You've completed the full Prisma + MySQL tutorial.
> Go build something awesome! 🚀
