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
            // The `create` field inside the `profile` relation performs a "nested write".
            // It tells Prisma to insert a new User record AND a new Profile record 
            // in a single database transaction, automatically linking the new Profile 
            // to the newly created User using its ID.
            profile: {
                create: {
                    bio: "Full-stack developer & blogger",
                    website: "https://alice.dev",
                    location: "San Francisco",
                },
            },
        },
        // The `include` option tells Prisma to fetch the related `profile` record
        include: { profile: true },
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
        // By default, Prisma only returns the parent model (the User).
        // `include: { posts: true }` tells Prisma to also fetch all 
        // the Post records we just created and attach them to the returned object.
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
            slug: "mysql-performance-tuning",
            content: "Tips for optimizing MySQL performance...",
            status: "PUBLISHED",
            // The `connect` field tells Prisma to link this new Post 
            // to an EXISTING record in the database, rather than creating a new one.
            // Here, it finds the User with the email "bob@blog.com" and sets them as the author.
            author: { connect: { email: "bob@blog.com" } },
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
        // Fetch both the connected Tag records and the connected User (author) record
        // so they are included in the `postWithTags` object returned by this query.
        include: {
            tags: true,
            author: true,
        },
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
                        include: {
                            user: { select: { name: true } }
                        },
                    }
                },
                orderBy: { createdAt: "desc" },
            }
        }
    })
    console.log("🌳 Full user tree:", JSON.stringify(fullUser, null, 2));


    // ═══════════════════════════════════════════
    // RELATION FILTERS — Query through relations
    // ═══════════════════════════════════════════
    // In Prisma, when you are filtering against a One-to-Many 
    // or Many-to-Many relationship (like a User who has many Posts), 
    // you use Relation Filters.

    // every:  Only return the User if ALL of their posts are PUBLISHED.
    // some:   Return the User if at least ONE of their posts is PUBLISHED.
    // none:   Return the User if NONE of their posts are PUBLISHED.

    // Find users who have at least one published post
    const usersWithPublishedPosts = await prisma.user.findMany({
        where: {
            posts: {
                some: {
                    status: "PUBLISHED",
                },
            },
        },
        include: {
            _count: { select: { posts: true } }
        },
    });
    console.log("Users with published posts:", usersWithPublishedPosts);

    // Find users with no posts
    const lurkers = await prisma.user.findMany({
        where: {
            posts: {
                none: {}
            }
        }
    });
    console.log("👻 Lurkers:", lurkers);

    // Find users where ALL posts are published
    const prolific = await prisma.user.findMany({
        where: {
            posts: {
                every: {
                    status: "PUBLISHED",
                }
            }
        }
    })

    console.log("🌟 All-published authors:", prolific);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());