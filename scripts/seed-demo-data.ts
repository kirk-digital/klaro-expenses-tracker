import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

const prisma = new PrismaClient();
const DEMO_PASSWORD = "Demo1234!";

function generateReceiptSvg(opts: {
  merchant: string;
  address: string;
  items: { label: string; amount: number }[];
  total: number;
  date: Date;
}): string {
  const dateStr = opts.date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeStr = opts.date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const lineHeight = 18;
  const headerHeight = 100;
  const footerHeight = 60;
  const itemsHeight = opts.items.length * lineHeight + 20;
  const totalHeight = headerHeight + itemsHeight + footerHeight;

  const itemLines = opts.items
    .map((item, i) => {
      const y = headerHeight + 20 + i * lineHeight;
      return `
      <text x="20" y="${y}" font-family="Courier New, monospace" font-size="11" fill="#111">${item.label}</text>
      <text x="280" y="${y}" font-family="Courier New, monospace" font-size="11" fill="#111" text-anchor="end">£${item.amount.toFixed(2)}</text>`;
    })
    .join("");

  const dividerY = headerHeight + itemsHeight + 10;
  const totalY = dividerY + 22;
  const thankY = totalY + 30;

  return `<svg width="300" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">
  <rect width="300" height="${totalHeight}" fill="white"/>
  <text x="150" y="30" text-anchor="middle" font-family="Courier New, monospace" font-size="14" font-weight="bold" fill="#111">${opts.merchant.toUpperCase()}</text>
  <text x="150" y="48" text-anchor="middle" font-family="Courier New, monospace" font-size="9" fill="#555">${opts.address}</text>
  <text x="150" y="64" text-anchor="middle" font-family="Courier New, monospace" font-size="9" fill="#555">Tel: 0161 000 1234</text>
  <line x1="20" y1="75" x2="280" y2="75" stroke="#bbb" stroke-width="1" stroke-dasharray="4,2"/>
  <text x="20" y="92" font-family="Courier New, monospace" font-size="9" fill="#777">Date: ${dateStr} ${timeStr}</text>
  <text x="280" y="92" text-anchor="end" font-family="Courier New, monospace" font-size="9" fill="#777">VAT: GB123456789</text>
  ${itemLines}
  <line x1="20" y1="${dividerY}" x2="280" y2="${dividerY}" stroke="#bbb" stroke-width="1" stroke-dasharray="4,2"/>
  <text x="20" y="${totalY}" font-family="Courier New, monospace" font-size="13" font-weight="bold" fill="#111">TOTAL</text>
  <text x="280" y="${totalY}" text-anchor="end" font-family="Courier New, monospace" font-size="13" font-weight="bold" fill="#111">£${opts.total.toFixed(2)}</text>
  <text x="150" y="${thankY}" text-anchor="middle" font-family="Courier New, monospace" font-size="10" fill="#888">Thank you for your custom</text>
  <text x="150" y="${thankY + 15}" text-anchor="middle" font-family="Courier New, monospace" font-size="9" fill="#bbb">*** Customer Copy ***</text>
</svg>`;
}

async function attachReceipt(
  prismaClient: PrismaClient,
  expenseId: string,
  orgId: string,
  svgContent: string,
  filename: string,
  uploadDir: string
) {
  const dir = join(uploadDir, orgId, expenseId);
  await mkdir(dir, { recursive: true });
  const filePath = join(dir, filename);
  await writeFile(filePath, svgContent, "utf-8");

  await prismaClient.receipt.create({
    data: {
      expenseId,
      filename,
      mimeType: "image/svg+xml",
      storagePath: filePath,
    },
  });
}

type ExpenseSeedData = {
  submittedById: string;
  categoryId: string;
  date: Date;
  type: "receipted" | "mileage";
  merchant: string;
  amount: number;
  miles?: number;
  amapRate?: number;
  notes?: string;
  revisionNote?: string;
  status: "pending" | "approved" | "rejected" | "needs_revision";
  fundId?: string;
  fundType?: string;
  receipt?: {
    merchant: string;
    address: string;
    items: { label: string; amount: number }[];
    total: number;
  };
};

async function main() {
  console.log("🌱 Seeding demo organisations...\n");
  const hash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const uploadDir = process.env.UPLOAD_DIR
    ? join(process.env.UPLOAD_DIR, "receipts")
    : join(process.cwd(), "uploads", "receipts");

  await seedBusiness(hash, uploadDir);
  await seedSoleTrader(hash, uploadDir);
  await seedCharity(hash, uploadDir);

  console.log("\n✅ Seeding complete.\n");
  console.log("Demo logins (all password: Demo1234!):");
  console.log("  Business:    james@hartleyconstruction.co.uk");
  console.log("  Sole Trader: dave@mitchellplumbing.co.uk");
  console.log("  Charity:     margaret@kirkdaletrust.org");
}

async function seedBusiness(hash: string, uploadDir: string) {
  const slug = "hartley-construction";
  const existing = await prisma.organization.findUnique({ where: { slug } });
  if (existing) {
    console.log("⏭  Hartley Construction already exists — skipping");
    return;
  }
  console.log("🏗  Creating Hartley Construction Ltd...");

  const james = await prisma.user.create({
    data: {
      name: "James Hartley",
      email: "james@hartleyconstruction.co.uk",
      passwordHash: hash,
    },
  });
  const sarah = await prisma.user.create({
    data: {
      name: "Sarah Mills",
      email: "sarah@hartleyconstruction.co.uk",
      passwordHash: hash,
    },
  });
  const tom = await prisma.user.create({
    data: {
      name: "Tom Briggs",
      email: "tom@hartleyconstruction.co.uk",
      passwordHash: hash,
    },
  });

  const org = await prisma.organization.create({
    data: { name: "Hartley Construction Ltd", slug, type: "business" },
  });

  await prisma.organizationMember.createMany({
    data: [
      { organizationId: org.id, userId: james.id, role: "owner" },
      { organizationId: org.id, userId: sarah.id, role: "approver" },
      { organizationId: org.id, userId: tom.id, role: "member" },
    ],
  });

  const cats = await prisma.category.createManyAndReturn({
    data: [
      {
        organizationId: org.id,
        name: "Materials and stock",
        hmrcCategory: "Reselling goods",
      },
      {
        organizationId: org.id,
        name: "Car and travel",
        hmrcCategory: "Car, van and travel expenses",
      },
      {
        organizationId: org.id,
        name: "Office and equipment",
        hmrcCategory: "Office, property and equipment",
      },
      { organizationId: org.id, name: "Clothing", hmrcCategory: "Clothing expenses" },
      {
        organizationId: org.id,
        name: "Legal and financial",
        hmrcCategory: "Legal and financial costs",
      },
      { organizationId: org.id, name: "Staff costs", hmrcCategory: "Staff expenses" },
      {
        organizationId: org.id,
        name: "Marketing and subscriptions",
        hmrcCategory: "Marketing, entertainment and subscriptions",
      },
      {
        organizationId: org.id,
        name: "Premises costs",
        hmrcCategory: "Premises costs (business property)",
      },
      { organizationId: org.id, name: "Training", hmrcCategory: "Training courses" },
      {
        organizationId: org.id,
        name: "Other allowable expenses",
        hmrcCategory: "Other allowable business expenses",
      },
    ],
  });
  const cat = (name: string) => cats.find((c) => c.name === name)!.id;

  const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

  const addExpense = async (data: ExpenseSeedData) => {
    const expense = await prisma.expense.create({
      data: {
        organizationId: org.id,
        submittedById: data.submittedById,
        categoryId: data.categoryId,
        expenseType: data.type,
        merchant: data.merchant,
        amount: data.amount,
        date: data.date,
        miles: data.miles ?? null,
        amapRate: data.amapRate ?? null,
        notes: data.notes ?? null,
        revisionNote: data.revisionNote ?? null,
        status: data.status,
      },
    });
    if (data.receipt) {
      const svg = generateReceiptSvg({ ...data.receipt, date: data.date });
      await attachReceipt(prisma, expense.id, org.id, svg, "receipt.svg", uploadDir);
    }
    return expense;
  };

  await addExpense({
    submittedById: tom.id,
    categoryId: cat("Materials and stock"),
    date: d(2026, 3, 4),
    type: "receipted",
    merchant: "Travis Perkins",
    amount: 447.8,
    status: "approved",
    receipt: {
      merchant: "Travis Perkins",
      address: "Salford Retail Park, M5 4DT",
      items: [
        { label: "Timber 4x2 C16 (x20)", amount: 189.0 },
        { label: "Plasterboard 12.5mm (x10)", amount: 145.0 },
        { label: "Screws & fixings", amount: 23.8 },
        { label: "Plaster bags (x5)", amount: 90.0 },
      ],
      total: 447.8,
    },
  });

  await addExpense({
    submittedById: tom.id,
    categoryId: cat("Materials and stock"),
    date: d(2026, 3, 12),
    type: "receipted",
    merchant: "Screwfix",
    amount: 89.97,
    status: "approved",
    receipt: {
      merchant: "Screwfix",
      address: "Unit 4, Trafford Park, M17 1SN",
      items: [
        { label: "DeWalt drill bits set", amount: 34.99 },
        { label: "Cable ties bulk pack", amount: 12.99 },
        { label: "Silicone sealant (x3)", amount: 23.97 },
        { label: "Spirit level 1.2m", amount: 18.02 },
      ],
      total: 89.97,
    },
  });

  await addExpense({
    submittedById: tom.id,
    categoryId: cat("Clothing"),
    date: d(2026, 3, 18),
    type: "receipted",
    merchant: "Screwfix",
    amount: 44.99,
    status: "approved",
    receipt: {
      merchant: "Screwfix",
      address: "Unit 4, Trafford Park, M17 1SN",
      items: [
        { label: "Hi-vis vest (x2)", amount: 14.99 },
        { label: "Safety boots size 10", amount: 30.0 },
      ],
      total: 44.99,
    },
  });

  await addExpense({
    submittedById: tom.id,
    categoryId: cat("Car and travel"),
    date: d(2026, 3, 22),
    type: "mileage",
    merchant: "Site visit — Stockport",
    amount: 45.0,
    miles: 100,
    amapRate: 0.45,
    status: "approved",
  });

  await addExpense({
    submittedById: james.id,
    categoryId: cat("Legal and financial"),
    date: d(2026, 4, 2),
    type: "receipted",
    merchant: "Zurich Insurance",
    amount: 125.0,
    status: "approved",
    notes: "Q1 public liability insurance premium",
    receipt: {
      merchant: "Zurich Insurance",
      address: "The Zurich Centre, Swindon, SN1 1EL",
      items: [{ label: "Public liability Q1", amount: 125.0 }],
      total: 125.0,
    },
  });

  await addExpense({
    submittedById: tom.id,
    categoryId: cat("Materials and stock"),
    date: d(2026, 4, 7),
    type: "receipted",
    merchant: "Jewson",
    amount: 318.4,
    status: "approved",
    receipt: {
      merchant: "Jewson",
      address: "Ashton Old Road, Manchester, M11 2WH",
      items: [
        { label: "Bricks (200 pack)", amount: 180.0 },
        { label: "Sand bags (x10)", amount: 55.0 },
        { label: "Cement (x8 bags)", amount: 48.0 },
        { label: "DPC membrane 10m", amount: 35.4 },
      ],
      total: 318.4,
    },
  });

  await addExpense({
    submittedById: tom.id,
    categoryId: cat("Car and travel"),
    date: d(2026, 4, 9),
    type: "mileage",
    merchant: "Site visit — Bolton",
    amount: 67.5,
    miles: 150,
    amapRate: 0.45,
    status: "approved",
  });

  await addExpense({
    submittedById: james.id,
    categoryId: cat("Car and travel"),
    date: d(2026, 4, 14),
    type: "receipted",
    merchant: "BP Garage",
    amount: 88.4,
    status: "approved",
    receipt: {
      merchant: "BP Connect",
      address: "Regent Road, Salford, M5 4HB",
      items: [{ label: "Diesel 72.5 litres", amount: 88.4 }],
      total: 88.4,
    },
  });

  await addExpense({
    submittedById: james.id,
    categoryId: cat("Marketing and subscriptions"),
    date: d(2026, 4, 16),
    type: "receipted",
    merchant: "Checkatrade",
    amount: 74.99,
    status: "approved",
    notes: "Monthly subscription — trade directory listing",
    receipt: {
      merchant: "Checkatrade",
      address: "2nd Floor, WeWork, Manchester, M1 2HN",
      items: [{ label: "Standard listing — April", amount: 74.99 }],
      total: 74.99,
    },
  });

  await addExpense({
    submittedById: tom.id,
    categoryId: cat("Materials and stock"),
    date: d(2026, 5, 5),
    type: "receipted",
    merchant: "Toolstation",
    amount: 156.97,
    status: "pending",
    receipt: {
      merchant: "Toolstation",
      address: "Regent Road, Manchester, M5 4LY",
      items: [
        { label: "SDS drill bit set", amount: 45.99 },
        { label: "Angle grinder discs x10", amount: 22.99 },
        { label: "Extension lead 25m", amount: 34.99 },
        { label: "Work gloves x6 pairs", amount: 18.0 },
        { label: "Pliers set", amount: 35.0 },
      ],
      total: 156.97,
    },
  });

  await addExpense({
    submittedById: tom.id,
    categoryId: cat("Car and travel"),
    date: d(2026, 5, 8),
    type: "mileage",
    merchant: "Site survey — Bury",
    amount: 22.5,
    miles: 50,
    amapRate: 0.45,
    status: "pending",
  });

  await addExpense({
    submittedById: tom.id,
    categoryId: cat("Materials and stock"),
    date: d(2026, 5, 12),
    type: "receipted",
    merchant: "B&Q Trade",
    amount: 234.5,
    status: "pending",
    receipt: {
      merchant: "B&Q Trade Point",
      address: "Manchester Fort Shopping Park, M9 8ED",
      items: [
        { label: "Underfloor insulation", amount: 120.0 },
        { label: "Plastic conduit 20m", amount: 34.5 },
        { label: "Stud adhesive x5", amount: 30.0 },
        { label: "Tiling grout (x5)", amount: 50.0 },
      ],
      total: 234.5,
    },
  });

  await addExpense({
    submittedById: james.id,
    categoryId: cat("Training"),
    date: d(2026, 5, 14),
    type: "receipted",
    merchant: "CITB",
    amount: 180.0,
    status: "needs_revision",
    notes: "CSCS card renewal for Tom Clarke — site team CSCS renewal",
    revisionNote:
      "Please confirm this expense is for Tom and not yourself — James, you already hold a valid CSCS card.",
    receipt: {
      merchant: "CITB",
      address: "Kings Court, London Road, Peterborough, PE2 8AL",
      items: [{ label: "CSCS Renewal — Labourer card", amount: 180.0 }],
      total: 180.0,
    },
  });

  console.log("   ✅ Hartley Construction Ltd");
}

async function seedSoleTrader(hash: string, uploadDir: string) {
  const slug = "dave-mitchell-plumbing";
  const existing = await prisma.organization.findUnique({ where: { slug } });
  if (existing) {
    console.log("⏭  Dave Mitchell Plumbing already exists — skipping");
    return;
  }
  console.log("🔧 Creating Dave Mitchell Plumbing...");

  const dave = await prisma.user.create({
    data: {
      name: "Dave Mitchell",
      email: "dave@mitchellplumbing.co.uk",
      passwordHash: hash,
    },
  });
  const org = await prisma.organization.create({
    data: { name: "Dave Mitchell Plumbing", slug, type: "sole_trader" },
  });
  await prisma.organizationMember.create({
    data: { organizationId: org.id, userId: dave.id, role: "owner" },
  });

  const cats = await prisma.category.createManyAndReturn({
    data: [
      {
        organizationId: org.id,
        name: "Materials and stock",
        hmrcCategory: "Reselling goods",
      },
      {
        organizationId: org.id,
        name: "Car and travel",
        hmrcCategory: "Car, van and travel expenses",
      },
      {
        organizationId: org.id,
        name: "Office and equipment",
        hmrcCategory: "Office, property and equipment",
      },
      { organizationId: org.id, name: "Clothing", hmrcCategory: "Clothing expenses" },
      {
        organizationId: org.id,
        name: "Legal and financial",
        hmrcCategory: "Legal and financial costs",
      },
      {
        organizationId: org.id,
        name: "Marketing and subscriptions",
        hmrcCategory: "Marketing, entertainment and subscriptions",
      },
      { organizationId: org.id, name: "Training", hmrcCategory: "Training courses" },
      {
        organizationId: org.id,
        name: "Premises costs",
        hmrcCategory: "Premises costs (business property)",
      },
      {
        organizationId: org.id,
        name: "Other allowable expenses",
        hmrcCategory: "Other allowable business expenses",
      },
    ],
  });
  const cat = (name: string) => cats.find((c) => c.name === name)!.id;
  const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

  const addExpense = async (
    data: Omit<ExpenseSeedData, "submittedById"> & { submittedById?: string }
  ) => {
    const expense = await prisma.expense.create({
      data: {
        organizationId: org.id,
        submittedById: data.submittedById ?? dave.id,
        categoryId: data.categoryId,
        expenseType: data.type,
        merchant: data.merchant,
        amount: data.amount,
        date: data.date,
        miles: data.miles ?? null,
        amapRate: data.amapRate ?? null,
        notes: data.notes ?? null,
        status: data.status,
      },
    });
    if (data.receipt) {
      const svg = generateReceiptSvg({ ...data.receipt, date: data.date });
      await attachReceipt(prisma, expense.id, org.id, svg, "receipt.svg", uploadDir);
    }
  };

  await addExpense({
    categoryId: cat("Materials and stock"),
    date: d(2026, 3, 3),
    type: "receipted",
    merchant: "Plumb Center",
    amount: 234.56,
    status: "approved",
    receipt: {
      merchant: "Plumb Center",
      address: "Oldham Road, Manchester, M4 6BG",
      items: [
        { label: "Copper pipe 22mm x 3m (x4)", amount: 89.6 },
        { label: "Push-fit elbows x10", amount: 24.99 },
        { label: "Isolation valves x4", amount: 36.0 },
        { label: "PTFE tape x5", amount: 4.97 },
        { label: "Flexible hose set", amount: 79.0 },
      ],
      total: 234.56,
    },
  });

  await addExpense({
    categoryId: cat("Car and travel"),
    date: d(2026, 3, 6),
    type: "mileage",
    merchant: "Job — Salford, M6",
    amount: 45.0,
    miles: 100,
    amapRate: 0.45,
    status: "approved",
    notes: "Bathroom installation, 2 days travel",
  });

  await addExpense({
    categoryId: cat("Materials and stock"),
    date: d(2026, 3, 11),
    type: "receipted",
    merchant: "Screwfix",
    amount: 67.98,
    status: "approved",
    receipt: {
      merchant: "Screwfix",
      address: "Unit 4, Trafford Park, M17 1SN",
      items: [
        { label: "Pipe cutter set", amount: 22.99 },
        { label: "Compression fittings pack", amount: 29.99 },
        { label: "Thread sealing tape", amount: 7.0 },
        { label: "Clip set mixed", amount: 8.0 },
      ],
      total: 67.98,
    },
  });

  await addExpense({
    categoryId: cat("Car and travel"),
    date: d(2026, 3, 19),
    type: "receipted",
    merchant: "BP Garage",
    amount: 92.4,
    status: "approved",
    receipt: {
      merchant: "BP Connect",
      address: "Liverpool Road, Manchester, M3 4NR",
      items: [{ label: "Diesel 75 litres", amount: 92.4 }],
      total: 92.4,
    },
  });

  await addExpense({
    categoryId: cat("Car and travel"),
    date: d(2026, 3, 25),
    type: "mileage",
    merchant: "Job — Wigan, WN1",
    amount: 90.0,
    miles: 200,
    amapRate: 0.45,
    status: "approved",
    notes: "Commercial boiler service — 4 visits",
  });

  await addExpense({
    categoryId: cat("Legal and financial"),
    date: d(2026, 4, 1),
    type: "receipted",
    merchant: "Simply Business",
    amount: 89.99,
    status: "approved",
    notes: "Monthly van insurance",
    receipt: {
      merchant: "Simply Business",
      address: "99 Gresham Street, London, EC2V 7NG",
      items: [{ label: "Van insurance — April", amount: 89.99 }],
      total: 89.99,
    },
  });

  await addExpense({
    categoryId: cat("Materials and stock"),
    date: d(2026, 4, 8),
    type: "receipted",
    merchant: "Plumb Center",
    amount: 156.8,
    status: "approved",
    receipt: {
      merchant: "Plumb Center",
      address: "Oldham Road, Manchester, M4 6BG",
      items: [
        { label: "Boiler flue kit", amount: 68.0 },
        { label: "Gas pipe 15mm x 3m (x3)", amount: 42.0 },
        { label: "Gas valve set", amount: 29.8 },
        { label: "Pressure gauge", amount: 17.0 },
      ],
      total: 156.8,
    },
  });

  await addExpense({
    categoryId: cat("Marketing and subscriptions"),
    date: d(2026, 4, 10),
    type: "receipted",
    merchant: "Checkatrade",
    amount: 49.99,
    status: "approved",
    receipt: {
      merchant: "Checkatrade",
      address: "2nd Floor, WeWork, Manchester, M1 2HN",
      items: [{ label: "Plumber listing — April", amount: 49.99 }],
      total: 49.99,
    },
  });

  await addExpense({
    categoryId: cat("Clothing"),
    date: d(2026, 4, 16),
    type: "receipted",
    merchant: "Screwfix",
    amount: 34.99,
    status: "approved",
    receipt: {
      merchant: "Screwfix",
      address: "Unit 4, Trafford Park, M17 1SN",
      items: [{ label: "Waterproof work trousers", amount: 34.99 }],
      total: 34.99,
    },
  });

  await addExpense({
    categoryId: cat("Car and travel"),
    date: d(2026, 5, 2),
    type: "mileage",
    merchant: "Estimate visit — Bolton",
    amount: 22.5,
    miles: 50,
    amapRate: 0.45,
    status: "pending",
  });

  await addExpense({
    categoryId: cat("Materials and stock"),
    date: d(2026, 5, 7),
    type: "receipted",
    merchant: "Toolstation",
    amount: 178.45,
    status: "pending",
    receipt: {
      merchant: "Toolstation",
      address: "Regent Road, Manchester, M5 4LY",
      items: [
        { label: 'Pipe wrench 24"', amount: 38.99 },
        { label: "Drain camera kit", amount: 89.0 },
        { label: "O-ring assortment", amount: 12.99 },
        { label: "Thread tap set", amount: 37.47 },
      ],
      total: 178.45,
    },
  });

  await addExpense({
    categoryId: cat("Training"),
    date: d(2026, 5, 13),
    type: "receipted",
    merchant: "Gas Safe Register",
    amount: 195.0,
    status: "pending",
    notes: "Annual Gas Safe registration renewal",
    receipt: {
      merchant: "Gas Safe Register",
      address: "1 Moorside North, Wilmslow, SK9 6DA",
      items: [{ label: "Gas Safe annual renewal", amount: 195.0 }],
      total: 195.0,
    },
  });

  console.log("   ✅ Dave Mitchell Plumbing");
}

async function seedCharity(hash: string, uploadDir: string) {
  const slug = "kirkdale-community-trust";
  const existing = await prisma.organization.findUnique({ where: { slug } });
  if (existing) {
    console.log("⏭  Kirkdale Community Trust already exists — skipping");
    return;
  }
  console.log("🤝 Creating Kirkdale Community Trust...");

  const margaret = await prisma.user.create({
    data: {
      name: "Margaret Reynolds",
      email: "margaret@kirkdaletrust.org",
      passwordHash: hash,
    },
  });
  const priya = await prisma.user.create({
    data: {
      name: "Priya Sharma",
      email: "priya@kirkdaletrust.org",
      passwordHash: hash,
    },
  });
  const org = await prisma.organization.create({
    data: { name: "Kirkdale Community Trust", slug, type: "charity" },
  });

  await prisma.organizationMember.createMany({
    data: [
      { organizationId: org.id, userId: margaret.id, role: "owner" },
      { organizationId: org.id, userId: priya.id, role: "member" },
    ],
  });

  const lottery = await prisma.fund.create({
    data: {
      organizationId: org.id,
      name: "National Lottery Community Fund 2025–26",
    },
  });
  const council = await prisma.fund.create({
    data: { organizationId: org.id, name: "Salford City Council Grant" },
  });

  const cats = await prisma.category.createManyAndReturn({
    data: [
      {
        organizationId: org.id,
        name: "Premises costs",
        hmrcCategory: "Premises costs (business property)",
      },
      {
        organizationId: org.id,
        name: "Car and travel",
        hmrcCategory: "Car, van and travel expenses",
      },
      {
        organizationId: org.id,
        name: "Marketing and subscriptions",
        hmrcCategory: "Marketing, entertainment and subscriptions",
      },
      {
        organizationId: org.id,
        name: "Office and equipment",
        hmrcCategory: "Office, property and equipment",
      },
      { organizationId: org.id, name: "Training", hmrcCategory: "Training courses" },
      {
        organizationId: org.id,
        name: "Other allowable expenses",
        hmrcCategory: "Other allowable business expenses",
      },
      {
        organizationId: org.id,
        name: "Volunteer expenses",
        hmrcCategory: "Other allowable business expenses",
      },
      {
        organizationId: org.id,
        name: "Fundraising costs",
        hmrcCategory: "Other allowable business expenses",
      },
      {
        organizationId: org.id,
        name: "Grant-funded activity",
        hmrcCategory: "Other allowable business expenses",
      },
    ],
  });
  const cat = (name: string) => cats.find((c) => c.name === name)!.id;
  const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

  const addExpense = async (data: ExpenseSeedData) => {
    const expense = await prisma.expense.create({
      data: {
        organizationId: org.id,
        submittedById: data.submittedById,
        categoryId: data.categoryId,
        expenseType: data.type ?? "receipted",
        merchant: data.merchant,
        amount: data.amount,
        date: data.date,
        fundId: data.fundId ?? null,
        fundType: data.fundType ?? "unrestricted",
        miles: data.miles ?? null,
        amapRate: data.amapRate ?? null,
        notes: data.notes ?? null,
        status: data.status,
      },
    });
    if (data.receipt) {
      const svg = generateReceiptSvg({ ...data.receipt, date: data.date });
      await attachReceipt(prisma, expense.id, org.id, svg, "receipt.svg", uploadDir);
    }
  };

  await addExpense({
    submittedById: margaret.id,
    categoryId: cat("Premises costs"),
    date: d(2026, 3, 1),
    type: "receipted",
    merchant: "Kirkdale Community Hall",
    amount: 350.0,
    fundId: lottery.id,
    fundType: "restricted",
    status: "approved",
    notes: "Hall hire for youth programme sessions — March block booking",
    receipt: {
      merchant: "Kirkdale Community Hall",
      address: "15 Kirkdale Road, Salford, M6 7AB",
      items: [{ label: "Hall hire x7 sessions", amount: 350.0 }],
      total: 350.0,
    },
  });

  await addExpense({
    submittedById: margaret.id,
    categoryId: cat("Marketing and subscriptions"),
    date: d(2026, 3, 8),
    type: "receipted",
    merchant: "Vistaprint",
    amount: 89.5,
    fundId: lottery.id,
    fundType: "restricted",
    status: "approved",
    notes: "Leaflets and posters for youth programme",
    receipt: {
      merchant: "Vistaprint",
      address: "14 Gateway, Crewe, CW1 6YY",
      items: [
        { label: "A5 leaflets x500", amount: 45.0 },
        { label: "A3 posters x50", amount: 29.5 },
        { label: "Delivery", amount: 15.0 },
      ],
      total: 89.5,
    },
  });

  await addExpense({
    submittedById: margaret.id,
    categoryId: cat("Grant-funded activity"),
    date: d(2026, 3, 15),
    type: "receipted",
    merchant: "Tesco Extra",
    amount: 124.3,
    fundId: lottery.id,
    fundType: "restricted",
    status: "approved",
    notes: "Refreshments and supplies for youth programme sessions",
    receipt: {
      merchant: "Tesco Extra",
      address: "Regent Retail Park, Salford, M5 3PT",
      items: [
        { label: "Refreshments (snacks/drinks)", amount: 78.5 },
        { label: "Art supplies", amount: 32.8 },
        { label: "Stationery pack", amount: 13.0 },
      ],
      total: 124.3,
    },
  });

  await addExpense({
    submittedById: margaret.id,
    categoryId: cat("Training"),
    date: d(2026, 4, 3),
    type: "receipted",
    merchant: "NCVO",
    amount: 145.0,
    fundId: lottery.id,
    fundType: "restricted",
    status: "approved",
    notes: "Youth work training materials — 2 facilitators",
    receipt: {
      merchant: "NCVO",
      address: "Society Building, 8 All Saints Street, London, N1 9RL",
      items: [{ label: "Youth work training pack x2", amount: 145.0 }],
      total: 145.0,
    },
  });

  await addExpense({
    submittedById: margaret.id,
    categoryId: cat("Office and equipment"),
    date: d(2026, 3, 20),
    type: "receipted",
    merchant: "Argos Trade",
    amount: 249.99,
    fundId: council.id,
    fundType: "restricted",
    status: "approved",
    notes: "Laptop for community outreach coordinator",
    receipt: {
      merchant: "Argos Trade",
      address: "Salford Shopping City, M6 6AB",
      items: [{ label: 'Acer laptop 15.6"', amount: 249.99 }],
      total: 249.99,
    },
  });

  await addExpense({
    submittedById: margaret.id,
    categoryId: cat("Marketing and subscriptions"),
    date: d(2026, 4, 1),
    type: "receipted",
    merchant: "Canva Pro",
    amount: 12.99,
    fundId: council.id,
    fundType: "restricted",
    status: "approved",
    notes: "Monthly design subscription for outreach materials",
    receipt: {
      merchant: "Canva Pty Ltd",
      address: "110 Kippax St, Surry Hills, NSW 2010",
      items: [{ label: "Canva Pro — April", amount: 12.99 }],
      total: 12.99,
    },
  });

  await addExpense({
    submittedById: priya.id,
    categoryId: cat("Volunteer expenses"),
    date: d(2026, 3, 10),
    type: "receipted",
    merchant: "Stagecoach Salford",
    amount: 18.4,
    fundType: "unrestricted",
    status: "approved",
    notes: "Bus travel to/from community sessions x4 weeks",
    receipt: {
      merchant: "Stagecoach Salford",
      address: "Frederick Road Depot, Salford, M6 6FZ",
      items: [{ label: "Weekly bus pass x4", amount: 18.4 }],
      total: 18.4,
    },
  });

  await addExpense({
    submittedById: priya.id,
    categoryId: cat("Volunteer expenses"),
    date: d(2026, 4, 7),
    type: "mileage",
    merchant: "Volunteer travel — home visits",
    amount: 22.5,
    miles: 50,
    amapRate: 0.45,
    fundType: "unrestricted",
    status: "approved",
    notes: "Home visits to 5 programme participants",
  });

  await addExpense({
    submittedById: margaret.id,
    categoryId: cat("Fundraising costs"),
    date: d(2026, 4, 20),
    type: "receipted",
    merchant: "Tesco Extra",
    amount: 85.6,
    fundType: "unrestricted",
    status: "approved",
    notes: "Refreshments for annual fundraising quiz night",
    receipt: {
      merchant: "Tesco Extra",
      address: "Regent Retail Park, Salford, M5 3PT",
      items: [
        { label: "Drinks & snacks", amount: 55.6 },
        { label: "Prize items", amount: 30.0 },
      ],
      total: 85.6,
    },
  });

  await addExpense({
    submittedById: margaret.id,
    categoryId: cat("Premises costs"),
    date: d(2026, 5, 1),
    type: "receipted",
    merchant: "Kirkdale Community Hall",
    amount: 350.0,
    fundId: lottery.id,
    fundType: "restricted",
    status: "pending",
    notes: "Hall hire for youth programme — May block booking",
    receipt: {
      merchant: "Kirkdale Community Hall",
      address: "15 Kirkdale Road, Salford, M6 7AB",
      items: [{ label: "Hall hire x7 sessions", amount: 350.0 }],
      total: 350.0,
    },
  });

  await addExpense({
    submittedById: priya.id,
    categoryId: cat("Volunteer expenses"),
    date: d(2026, 5, 6),
    type: "receipted",
    merchant: "Stagecoach Salford",
    amount: 18.4,
    fundType: "unrestricted",
    status: "pending",
    notes: "Bus travel May — awaiting treasurer approval",
    receipt: {
      merchant: "Stagecoach Salford",
      address: "Frederick Road Depot, Salford, M6 6FZ",
      items: [{ label: "Weekly bus pass x4", amount: 18.4 }],
      total: 18.4,
    },
  });

  await addExpense({
    submittedById: margaret.id,
    categoryId: cat("Grant-funded activity"),
    date: d(2026, 5, 10),
    type: "receipted",
    merchant: "Amazon Business",
    amount: 234.8,
    fundId: lottery.id,
    fundType: "restricted",
    status: "needs_revision",
    notes: "Please split this invoice — some items are not lottery-eligible",
    receipt: {
      merchant: "Amazon Business",
      address: "Amazon UK Services Ltd, London, EC2N 1HQ",
      items: [
        { label: "Sports equipment pack", amount: 145.0 },
        { label: "Art & craft supplies", amount: 67.8 },
        { label: "Office stationery", amount: 22.0 },
      ],
      total: 234.8,
    },
  });

  console.log("   ✅ Kirkdale Community Trust");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
