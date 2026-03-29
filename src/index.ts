import "dotenv/config";
import { PrismaClient } from "./generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

// Create the Prisma MariaDB adapter with the connection URL
const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);

// Initialize Prisma Client with the adapter
const prisma = new PrismaClient({
    adapter,
    log: ["query", "info", "warn", "error"],
});

const roles = ["USER", "ADMIN", "MODERATOR"] as const;

function createPhoneNumber() {
    const areaCode = Math.floor(Math.random() * 900) + 100;
    const prefix = Math.floor(Math.random() * 900) + 100;
    const lineNumber = Math.floor(Math.random() * 9000) + 1000;
    return `${areaCode}-${prefix}-${lineNumber}`;
}

async function main() {

    // ═══════════════════════════════════════════
    // Delete the full table for resetting
    // ═══════════════════════════════════════════
    await prisma.user.deleteMany();

    // Create 10 users using prisma.user.createMany
    // const users = Array.from({ length: 10 }, (_, i) => ({
    //     email: `user${i}@example.com`,
    //     name: `User ${i}`,
    //     age: 20 + i,
    //     role: i % 2 === 0 ? "ADMIN" : "USER",
    // }));
    // const batchResults = await prisma.user.createMany({
    //     data: users,
    // });
    // console.log(`✅ Batch created: ${batchResults.count} users`);

    const users = Array.from({ length: 10 }, (_, i) => ({
        email: `user${i}@example.com`,
        name: `User ${i}`,
        age: Math.floor(Math.random() * 50) + 18,
        role: roles[Math.floor(Math.random() * roles.length)],
        phone: createPhoneNumber(),
    }));

    const batchResults = await prisma.user.createMany({
        data: users,
    });
    console.log(`✅ Batch created: ${batchResults.count} users`);


    // Find all MODERATOR users, sortbed by createdAt and print them
    const moderators = await prisma.user.findMany({
        where: { "role": "MODERATOR" },
        orderBy: { "createdAt": "desc" }
    })
    console.log("Moderators:", moderators);

    // Update all users with no age to 25
    const updateUsers = await prisma.user.updateMany({
        where: { "age": null },
        data: { "age": 25 }
    });
    console.log(`✅ Updated ${updateUsers.count} users`);

    // Count users grouped by role
    const userCount = await prisma.user.groupBy({
        by: ["role"],
        _count: true,
        _avg: { age: true },
    })
    console.log("User count by role:", userCount);

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
