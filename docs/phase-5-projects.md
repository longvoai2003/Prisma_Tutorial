# Phase 5: Real-World Projects

> 🔴 **Level**: Advanced | ⏱ **Time**: 90+ minutes

---

## Project 1: 📝 Blog API (Express + Prisma + MySQL)

A complete REST API with authentication patterns, CRUD, pagination, and search.

### Setup

```bash
mkdir blog-api && cd blog-api
npm init -y
npm install express @prisma/client @prisma/adapter-mariadb dotenv bcryptjs jsonwebtoken
npm install -D prisma typescript ts-node @types/node @types/express \
  @types/bcryptjs @types/jsonwebtoken
npx prisma init --datasource-provider mysql
```

### Schema (`prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-ts"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "mysql"
  // URL is configured in prisma.config.ts (for CLI) and via the adapter (for runtime)
}

model User {
  id           Int       @id @default(autoincrement())
  email        String    @unique
  username     String    @unique
  passwordHash String
  displayName  String?
  bio          String?   @db.Text
  avatar       String?
  role         UserRole  @default(AUTHOR)
  createdAt    DateTime  @default(now())

  posts        Post[]
  comments     Comment[]

  @@map("blog_users")
}

model Post {
  id          Int        @id @default(autoincrement())
  title       String     @db.VarChar(255)
  slug        String     @unique
  content     String     @db.LongText
  excerpt     String?    @db.VarChar(500)
  coverImage  String?
  status      PostStatus @default(DRAFT)
  views       Int        @default(0)
  publishedAt DateTime?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  authorId    Int
  author      User       @relation(fields: [authorId], references: [id])
  comments    Comment[]
  categories  Category[]

  @@index([authorId])
  @@index([status, publishedAt])
  @@map("blog_posts")
}

model Comment {
  id        Int      @id @default(autoincrement())
  content   String   @db.Text
  createdAt DateTime @default(now())

  postId    Int
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  userId    Int
  user      User     @relation(fields: [userId], references: [id])

  @@map("blog_comments")
}

model Category {
  id    Int    @id @default(autoincrement())
  name  String @unique
  slug  String @unique
  posts Post[]

  @@map("blog_categories")
}

enum UserRole {
  AUTHOR
  EDITOR
  ADMIN
}

enum PostStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}
```

### API Routes (`src/server.ts`)

```typescript
import express from "express";
import "dotenv/config";
import { PrismaClient, Prisma } from "./generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const app = express();
const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });
app.use(express.json());

// ─── GET /api/posts — List with pagination, search, filters ───
app.get("/api/posts", async (req, res) => {
  const {
    page = "1",
    limit = "10",
    search,
    status = "PUBLISHED",
    category,
    sortBy = "publishedAt",
    order = "desc",
  } = req.query;

  const where: Prisma.PostWhereInput = {
    status: status as any,
    ...(search && {
      OR: [
        { title: { contains: search as string } },
        { content: { contains: search as string } },
      ],
    }),
    ...(category && {
      categories: { some: { slug: category as string } },
    }),
  };

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: {
        author: { select: { username: true, displayName: true, avatar: true } },
        categories: { select: { name: true, slug: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { [sortBy as string]: order },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.post.count({ where }),
  ]);

  res.json({
    data: posts,
    meta: {
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
});

// ─── GET /api/posts/:slug — Single post with view increment ───
app.get("/api/posts/:slug", async (req, res) => {
  const post = await prisma.post.update({
    where: { slug: req.params.slug },
    data: { views: { increment: 1 } },
    include: {
      author: { select: { username: true, displayName: true, bio: true } },
      categories: true,
      comments: {
        include: { user: { select: { username: true, avatar: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  res.json(post);
});

// ─── POST /api/posts — Create post ───
app.post("/api/posts", async (req, res) => {
  const { title, content, excerpt, categoryIds, authorId } = req.body;
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const post = await prisma.post.create({
    data: {
      title,
      slug,
      content,
      excerpt,
      authorId,
      categories: categoryIds
        ? { connect: categoryIds.map((id: number) => ({ id })) }
        : undefined,
    },
    include: { categories: true },
  });
  res.status(201).json(post);
});

// ─── PATCH /api/posts/:id/publish — Publish a draft ───
app.patch("/api/posts/:id/publish", async (req, res) => {
  const post = await prisma.post.update({
    where: { id: Number(req.params.id) },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
  res.json(post);
});

// ─── GET /api/stats — Dashboard stats ───
app.get("/api/stats", async (req, res) => {
  const [postStats, topPosts, topAuthors] = await Promise.all([
    prisma.post.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
    prisma.post.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { views: "desc" },
      take: 5,
      select: { title: true, slug: true, views: true },
    }),
    prisma.user.findMany({
      orderBy: { posts: { _count: "desc" } },
      take: 5,
      select: {
        username: true,
        displayName: true,
        _count: { select: { posts: true } },
      },
    }),
  ]);

  res.json({ postStats, topPosts, topAuthors });
});

app.listen(3000, () => console.log("🚀 Blog API on http://localhost:3000"));
```

---

## Project 2: 🛒 E-Commerce (Schema Design Only)

A production-ready e-commerce schema demonstrating advanced Prisma patterns:

```prisma
model Customer {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String
  phone     String?
  addresses Address[]
  orders    Order[]
  cart      CartItem[]
  createdAt DateTime @default(now())

  @@map("customers")
}

model Address {
  id         Int      @id @default(autoincrement())
  street     String
  city       String
  state      String
  zipCode    String
  country    String   @default("US")
  isDefault  Boolean  @default(false)
  customerId Int
  customer   Customer @relation(fields: [customerId], references: [id])

  @@map("addresses")
}

model Product {
  id          Int        @id @default(autoincrement())
  name        String
  slug        String     @unique
  description String?    @db.Text
  price       Decimal    @db.Decimal(10, 2)
  compareAt   Decimal?   @db.Decimal(10, 2)   // original price
  sku         String     @unique
  stock       Int        @default(0)
  isActive    Boolean    @default(true)
  images      Json       // ["url1", "url2"]
  metadata    Json?      // flexible attributes
  categoryId  Int
  category    Category   @relation(fields: [categoryId], references: [id])
  orderItems  OrderItem[]
  cartItems   CartItem[]
  createdAt   DateTime   @default(now())

  @@index([categoryId])
  @@index([price])
  @@map("products")
}

model Category {
  id       Int        @id @default(autoincrement())
  name     String     @unique
  slug     String     @unique
  parentId Int?
  parent   Category?  @relation("SubCategories", fields: [parentId], references: [id])
  children Category[] @relation("SubCategories")  // self-relation!
  products Product[]

  @@map("categories")
}

model Order {
  id          Int         @id @default(autoincrement())
  orderNumber String      @unique @default(uuid())
  status      OrderStatus @default(PENDING)
  subtotal    Decimal     @db.Decimal(10, 2)
  tax         Decimal     @db.Decimal(10, 2)
  shipping    Decimal     @db.Decimal(10, 2)
  total       Decimal     @db.Decimal(10, 2)
  notes       String?     @db.Text
  customerId  Int
  customer    Customer    @relation(fields: [customerId], references: [id])
  items       OrderItem[]
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  @@index([customerId])
  @@index([status])
  @@map("orders")
}

model OrderItem {
  id        Int     @id @default(autoincrement())
  quantity  Int
  unitPrice Decimal @db.Decimal(10, 2)
  total     Decimal @db.Decimal(10, 2)
  orderId   Int
  order     Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId Int
  product   Product @relation(fields: [productId], references: [id])

  @@map("order_items")
}

model CartItem {
  id         Int      @id @default(autoincrement())
  quantity   Int      @default(1)
  customerId Int
  customer   Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  productId  Int
  product    Product  @relation(fields: [productId], references: [id])
  addedAt    DateTime @default(now())

  @@unique([customerId, productId])
  @@map("cart_items")
}

enum OrderStatus {
  PENDING
  CONFIRMED
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
  REFUNDED
}
```

### Key E-Commerce Query: Place Order Transaction

```typescript
async function placeOrder(customerId: number) {
  return prisma.$transaction(async (tx) => {
    // 1. Get cart items
    const cartItems = await tx.cartItem.findMany({
      where: { customerId },
      include: { product: true },
    });

    if (cartItems.length === 0) throw new Error("Cart is empty");

    // 2. Check stock & calculate totals
    let subtotal = 0;
    for (const item of cartItems) {
      if (item.product.stock < item.quantity) {
        throw new Error(`${item.product.name} is out of stock`);
      }
      subtotal += Number(item.product.price) * item.quantity;
    }

    const tax = subtotal * 0.08;
    const shipping = subtotal > 100 ? 0 : 9.99;
    const total = subtotal + tax + shipping;

    // 3. Create order
    const order = await tx.order.create({
      data: {
        customerId,
        subtotal,
        tax,
        shipping,
        total,
        items: {
          create: cartItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.product.price,
            total: Number(item.product.price) * item.quantity,
          })),
        },
      },
      include: { items: true },
    });

    // 4. Decrement stock
    for (const item of cartItems) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    // 5. Clear cart
    await tx.cartItem.deleteMany({ where: { customerId } });

    return order;
  });
}
```

---

## Project 3: ✅ Task Manager (Quick Reference)

A simpler project showing workspace/project organization:

```prisma
model Workspace {
  id       Int       @id @default(autoincrement())
  name     String
  slug     String    @unique
  projects Project[]
  members  Member[]

  @@map("workspaces")
}

model Member {
  id          Int         @id @default(autoincrement())
  email       String
  name        String
  memberRole  MemberRole  @default(MEMBER)
  workspaceId Int
  workspace   Workspace   @relation(fields: [workspaceId], references: [id])
  tasks       Task[]      @relation("assignee")

  @@unique([email, workspaceId])
  @@map("members")
}

model Project {
  id          Int       @id @default(autoincrement())
  name        String
  description String?
  color       String    @default("#6366f1")
  workspaceId Int
  workspace   Workspace @relation(fields: [workspaceId], references: [id])
  tasks       Task[]

  @@map("projects")
}

model Task {
  id          Int        @id @default(autoincrement())
  title       String
  description String?    @db.Text
  status      TaskStatus @default(TODO)
  priority    Priority   @default(MEDIUM)
  dueDate     DateTime?
  completedAt DateTime?
  position    Int        @default(0)  // for drag-and-drop ordering
  projectId   Int
  project     Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  assigneeId  Int?
  assignee    Member?    @relation("assignee", fields: [assigneeId], references: [id])
  labels      Label[]
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  @@index([projectId, status])
  @@map("tasks")
}

model Label {
  id    Int    @id @default(autoincrement())
  name  String @unique
  color String @default("#94a3b8")
  tasks Task[]

  @@map("labels")
}

enum TaskStatus { TODO  IN_PROGRESS  IN_REVIEW  DONE  CANCELLED }
enum Priority   { LOW  MEDIUM  HIGH  URGENT }
enum MemberRole { OWNER  ADMIN  MEMBER  VIEWER }
```

---

> **Next**: [Phase 6 — Other Databases →](./phase-6-other-databases.md)
