import { PrismaClient, ExpenseStatus, MemberRole } from "@prisma/client";
import { hash } from "bcryptjs";
import { getDefaultCategories } from "../lib/categories";

const prisma = new PrismaClient();

async function main() {
  await prisma.expenseComment.deleteMany();
  await prisma.receipt.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.fund.deleteMany();
  await prisma.category.deleteMany();
  await prisma.organizationMember.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await hash("password123", 12);

  const owner = await prisma.user.create({
    data: {
      name: "Owner User",
      email: "owner@test.com",
      passwordHash,
    },
  });

  const member = await prisma.user.create({
    data: {
      name: "Member User",
      email: "member@test.com",
      passwordHash,
    },
  });

  const org = await prisma.organization.create({
    data: {
      name: "Acme Inc",
      slug: "acme",
      type: "business",
      currency: "GBP",
    },
  });

  await prisma.organizationMember.createMany({
    data: [
      { organizationId: org.id, userId: owner.id, role: MemberRole.owner },
      { organizationId: org.id, userId: member.id, role: MemberRole.member },
    ],
  });

  const defaultCategories = getDefaultCategories("business");
  const categories = await Promise.all(
    defaultCategories.map((c) =>
      prisma.category.create({
        data: {
          organizationId: org.id,
          name: c.name,
          hmrcCategory: c.hmrcCategory,
        },
      })
    )
  );

  const cat = (n: string) => categories.find((c) => c.name === n)!;

  const now = new Date();
  const y = now.getFullYear();
  const mo = now.getMonth();
  const day = (d: number) => new Date(y, mo, d);

  await prisma.expense.createMany({
    data: [
      {
        organizationId: org.id,
        submittedById: member.id,
        categoryId: cat("Car and travel").id,
        amount: 120.5,
        merchant: "Airline tickets",
        date: day(4),
        status: ExpenseStatus.approved,
        notes: "Conference travel",
      },
      {
        organizationId: org.id,
        submittedById: member.id,
        categoryId: cat("Marketing and subscriptions").id,
        amount: 48.2,
        merchant: "Team dinner",
        date: day(6),
        status: ExpenseStatus.pending,
      },
      {
        organizationId: org.id,
        submittedById: member.id,
        categoryId: cat("Office and equipment").id,
        amount: 29,
        merchant: "SaaS subscription",
        date: day(8),
        status: ExpenseStatus.pending,
      },
      {
        organizationId: org.id,
        submittedById: member.id,
        categoryId: cat("Materials and stock").id,
        amount: 15.99,
        merchant: "Stationery store",
        date: day(10),
        status: ExpenseStatus.rejected,
        notes: "Missing receipt",
      },
      {
        organizationId: org.id,
        submittedById: member.id,
        categoryId: cat("Office and equipment").id,
        amount: 899,
        merchant: "Laptop upgrade",
        date: day(12),
        status: ExpenseStatus.needs_revision,
        notes: "Please add asset tag",
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
