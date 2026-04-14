import fs from "fs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// Load DATABASE_URL from .env.vercel
const envContent = fs.readFileSync(".env.vercel", "utf-8");
const match = envContent.match(/DATABASE_URL="([^"]+)"/);
const dbUrl = match ? match[1] : process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("No DATABASE_URL found!");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: dbUrl, max: 2 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Looking for designer with email g0527111319@gmail.com...");

  const d = await prisma.designer.findFirst({
    where: { email: "g0527111319@gmail.com" },
    select: { id: true, fullName: true, email: true, phone: true, approvalStatus: true },
  });

  console.log("Found:", d);

  if (d) {
    const updated = await prisma.designer.update({
      where: { id: d.id },
      data: { approvalStatus: "PENDING" },
      select: { id: true, fullName: true, approvalStatus: true },
    });
    console.log("Updated to PENDING:", updated);
  } else {
    console.log("Not found by email - checking by phone...");
    const byPhone = await prisma.designer.findFirst({
      where: { phone: "0527111319" },
      select: { id: true, fullName: true, email: true, phone: true, approvalStatus: true },
    });
    console.log("Found by phone:", byPhone);
    if (byPhone) {
      const updated = await prisma.designer.update({
        where: { id: byPhone.id },
        data: { approvalStatus: "PENDING" },
        select: { id: true, fullName: true, approvalStatus: true },
      });
      console.log("Updated to PENDING:", updated);
    }
  }

  console.log("\nAll PENDING designers:");
  const pending = await prisma.designer.findMany({
    where: { approvalStatus: "PENDING" },
    select: { id: true, fullName: true, email: true, phone: true, approvalStatus: true },
  });
  pending.forEach((p) => console.log(`  - ${p.fullName} | ${p.email} | ${p.phone}`));
  console.log(`Total pending: ${pending.length}`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
