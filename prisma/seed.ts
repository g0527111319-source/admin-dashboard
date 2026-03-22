import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString || connectionString.includes("YOUR_PASSWORD")) {
    console.log("⚠️  DATABASE_URL is not configured — skipping DB seed");
    console.log("   Set up your Supabase DB URL in .env first.\n");
    printCredentials();
    return;
  }

  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log("🌱 Seeding database...\n");

  // הצפנת סיסמאות
  const supplierPass = await bcrypt.hash("Supplier123!", 12);
  const designerPass = await bcrypt.hash("Designer123!", 12);

  // ==========================================
  // ספקים — Suppliers
  // ==========================================
  const suppliers = await Promise.all([
    prisma.supplier.create({
      data: {
        name: "סטון דיזיין",
        contactName: "יוסי כהן",
        phone: "0521234567",
        email: "supplier@zirat.co.il",
        category: "ריצוף וחיפוי",
        city: "תל אביב",
        area: "מרכז",
        website: "https://stone-design.co.il",
        description: "מובילים בתחום הריצוף והחיפוי — יבוא ישיר מאיטליה ופורטוגל. קולקציות בלעדיות.",
        subscriptionStart: new Date("2025-06-15"),
        subscriptionEnd: new Date("2026-06-15"),
        monthlyFee: 500,
        paymentStatus: "PAID",
        lastPaymentDate: new Date("2026-03-01"),
        totalPosts: 24,
        postsThisMonth: 3,
        totalDeals: 18,
        totalDealAmount: 156000,
        averageRating: 4.5,
        ratingCount: 12,
        loginToken: "supplier-stone-demo-token",
        passwordHash: supplierPass,
      },
    }),
    prisma.supplier.create({
      data: {
        name: "אור תאורה",
        contactName: "רחל לוי",
        phone: "0529876543",
        email: "or@lighting.co.il",
        category: "תאורה",
        city: "הרצליה",
        area: "שרון",
        website: "https://or-lighting.co.il",
        description: "גופי תאורה מעוצבים — סקנדינבי, מודרני ואקלקטי. ייבוא ישיר מדנמרק.",
        subscriptionStart: new Date("2025-09-20"),
        subscriptionEnd: new Date("2026-03-20"),
        monthlyFee: 450,
        paymentStatus: "OVERDUE",
        lastPaymentDate: new Date("2026-01-15"),
        totalPosts: 15,
        postsThisMonth: 0,
        totalDeals: 8,
        totalDealAmount: 68000,
        averageRating: 3.0,
        ratingCount: 6,
        loginToken: "supplier-or-demo-token",
        passwordHash: supplierPass,
      },
    }),
    prisma.supplier.create({
      data: {
        name: "קיטשן פלוס",
        contactName: "דני אברהם",
        phone: "0541112233",
        email: "kitchen@plus.co.il",
        category: "מטבחים",
        city: "ראשון לציון",
        area: "מרכז",
        website: "https://kitchenplus.co.il",
        description: "מטבחים מותאמים אישית — עיצוב, ייצור והתקנה מקצה לקצה. 20 שנות ניסיון.",
        subscriptionStart: new Date("2025-04-01"),
        subscriptionEnd: new Date("2026-09-30"),
        monthlyFee: 600,
        paymentStatus: "PAID",
        lastPaymentDate: new Date("2026-03-05"),
        totalPosts: 31,
        postsThisMonth: 4,
        totalDeals: 22,
        totalDealAmount: 320000,
        averageRating: 4.8,
        ratingCount: 18,
        loginToken: "supplier-kitchen-demo-token",
        passwordHash: supplierPass,
      },
    }),
  ]);

  console.log(`✅ Created ${suppliers.length} suppliers`);

  // ==========================================
  // מעצבות — Designers
  // ==========================================
  const designers = await Promise.all([
    prisma.designer.create({
      data: {
        fullName: "נועה כהנוביץ'",
        phone: "0501234567",
        email: "designer@zirat.co.il",
        city: "תל אביב",
        area: "מרכז",
        specialization: "עיצוב פנים",
        yearsExperience: 8,
        instagram: "https://instagram.com/noa_design",
        totalDealsReported: 12,
        totalDealAmount: 85000,
        lotteryEntriesTotal: 8,
        lotteryWinsTotal: 1,
        eventsAttended: 5,
        loginToken: "designer-noa-demo-token",
        passwordHash: designerPass,
      },
    }),
    prisma.designer.create({
      data: {
        fullName: "מיכל לוינשטיין",
        phone: "0527654321",
        email: "michal@arch.co.il",
        city: "הרצליה",
        area: "שרון",
        specialization: "אדריכלות",
        yearsExperience: 15,
        instagram: "https://instagram.com/michal_arch",
        totalDealsReported: 24,
        totalDealAmount: 210000,
        lotteryEntriesTotal: 18,
        lotteryWinsTotal: 2,
        eventsAttended: 8,
        loginToken: "designer-michal-demo-token",
        passwordHash: designerPass,
      },
    }),
    prisma.designer.create({
      data: {
        fullName: "שירה אבן צור",
        phone: "0541122334",
        email: "shira@intdesign.co.il",
        city: "ירושלים",
        area: "ירושלים",
        specialization: "עיצוב פנים",
        yearsExperience: 5,
        totalDealsReported: 6,
        totalDealAmount: 42000,
        lotteryEntriesTotal: 4,
        lotteryWinsTotal: 0,
        eventsAttended: 3,
        loginToken: "designer-shira-demo-token",
        passwordHash: designerPass,
      },
    }),
    prisma.designer.create({
      data: {
        fullName: "רותם דיין",
        phone: "0509876543",
        email: "rotem@spaces.co.il",
        city: "חיפה",
        area: "צפון",
        specialization: "אדריכלות",
        yearsExperience: 12,
        totalDealsReported: 15,
        totalDealAmount: 125000,
        lotteryEntriesTotal: 12,
        lotteryWinsTotal: 0,
        eventsAttended: 6,
        loginToken: "designer-rotem-demo-token",
        passwordHash: designerPass,
      },
    }),
    prisma.designer.create({
      data: {
        fullName: "יעל גולדברג",
        phone: "0521112233",
        email: "yael@golddesign.co.il",
        city: "רעננה",
        area: "שרון",
        specialization: "עיצוב פנים",
        yearsExperience: 3,
        totalDealsReported: 4,
        totalDealAmount: 28000,
        lotteryEntriesTotal: 3,
        lotteryWinsTotal: 0,
        eventsAttended: 2,
        loginToken: "designer-yael-demo-token",
        passwordHash: designerPass,
      },
    }),
    ...Array.from({ length: 5 }, (_, i) =>
      prisma.designer.create({
        data: {
          fullName: `מעצבת דמו ${i + 6}`,
          phone: `050${String(6000000 + i).padStart(7, "0")}`,
          email: `demo${i + 6}@test.co.il`,
          city: ["תל אביב", "ירושלים", "חיפה", "באר שבע", "נתניה"][i],
          area: ["מרכז", "ירושלים", "צפון", "דרום", "שרון"][i],
          specialization: ["עיצוב פנים", "אדריכלות", "נוף", "עיצוב פנים", "הכל"][i],
          yearsExperience: Math.floor(Math.random() * 20) + 1,
          totalDealsReported: Math.floor(Math.random() * 10),
          totalDealAmount: Math.floor(Math.random() * 100000),
          loginToken: `designer-demo-${i + 6}-token`,
          passwordHash: designerPass,
        },
      })
    ),
  ]);

  console.log(`✅ Created ${designers.length} designers`);

  // ==========================================
  // פרסומים — Posts
  // ==========================================
  const posts = await Promise.all([
    prisma.post.create({
      data: {
        supplierId: suppliers[0].id,
        status: "PUBLISHED",
        scheduledTime: "10:30",
        scheduledDate: new Date("2026-03-07"),
        publishedAt: new Date("2026-03-07T10:30:00"),
        caption: "קולקציית אריחי פורצלן חדשה — גוונים טבעיים בהשראת האדמה",
        hasLogo: true,
        hasSupplierLogo: true,
        hasDesignerCredit: true,
        approvedBy: "תמר",
      },
    }),
    prisma.post.create({
      data: {
        supplierId: suppliers[0].id,
        status: "PENDING",
        scheduledTime: "10:30",
        scheduledDate: new Date("2026-03-09"),
        caption: "פרויקט מושלם — ריצוף טראצו בדירת גן בתל אביב. עבודה מיוחדת!",
        hasLogo: true,
        hasSupplierLogo: true,
        hasDesignerCredit: false,
      },
    }),
    prisma.post.create({
      data: {
        supplierId: suppliers[2].id,
        status: "PENDING",
        scheduledTime: "13:30",
        scheduledDate: new Date("2026-03-09"),
        caption: "מטבח חלומי? הנה פרויקט שסיימנו — שיש קלקטה מרהיב",
        hasLogo: true,
        hasSupplierLogo: true,
        hasDesignerCredit: true,
      },
    }),
  ]);

  console.log(`✅ Created ${posts.length} posts`);

  // ==========================================
  // עסקאות — Deals
  // ==========================================
  const deals = await Promise.all([
    prisma.deal.create({
      data: {
        designerId: designers[0].id,
        supplierId: suppliers[0].id,
        amount: 12000,
        description: "ריצוף סלון + מטבח",
        dealDate: new Date("2026-03-01"),
        supplierConfirmed: true,
        supplierConfirmedAt: new Date("2026-03-02"),
        rating: 5,
        ratingText: "שירות מעולה, אספקה בזמן!",
      },
    }),
    prisma.deal.create({
      data: {
        designerId: designers[1].id,
        supplierId: suppliers[1].id,
        amount: 8500,
        description: "גופי תאורה לפרויקט",
        dealDate: new Date("2026-03-03"),
        supplierConfirmed: true,
        supplierConfirmedAt: new Date("2026-03-04"),
        rating: 3,
        ratingText: "מוצרים יפים אבל אספקה איטית",
      },
    }),
    prisma.deal.create({
      data: {
        designerId: designers[2].id,
        supplierId: suppliers[2].id,
        amount: 45000,
        description: "מטבח מותאם אישית",
        dealDate: new Date("2026-02-20"),
        supplierConfirmed: true,
        supplierConfirmedAt: new Date("2026-02-21"),
        rating: 5,
        ratingText: "הכי טובים בתחום!",
      },
    }),
  ]);

  console.log(`✅ Created ${deals.length} deals`);

  // ==========================================
  // אירועים — Events
  // ==========================================
  const events = await Promise.all([
    prisma.event.create({
      data: {
        title: "סדנת חומרים חדשים 2026",
        description: "סדנה מעשית להכרת חומרי גמר חדשניים",
        date: new Date("2026-03-15T18:00:00"),
        location: "חלל סטודיו TLV, יפו 33, תל אביב",
        isPaid: true,
        price: 120,
        maxAttendees: 40,
        status: "OPEN",
      },
    }),
    prisma.event.create({
      data: {
        title: "מפגש נטוורקינג — מעצבות x ספקים",
        description: "ערב פתוח להיכרות בין מעצבות לספקים",
        date: new Date("2026-03-22T19:00:00"),
        location: "גלריה 12, דרך חברון 12, ירושלים",
        isPaid: false,
        maxAttendees: 60,
        status: "OPEN",
      },
    }),
  ]);

  console.log(`✅ Created ${events.length} events`);

  // ==========================================
  // הגרלה
  // ==========================================
  await prisma.lottery.create({
    data: {
      month: "2026-03",
      prize: "שובר מתנה לרשת הום סנטר",
      prizeValue: 1000,
      status: "PREPARING",
      eligibleDesigners: designers.slice(0, 5).map((d) => d.id),
    },
  });

  console.log("✅ Created lottery");

  // ==========================================
  // לקוחות CRM — Demo Clients (for designer נועה)
  // ==========================================
  const demoDesigner = designers[0]; // נועה כהנוביץ'

  const client1 = await prisma.crmClient.create({
    data: {
      designerId: demoDesigner.id,
      name: "רונית ואבי כהן",
      phone: "054-1234567",
      email: "ronit.cohen@example.com",
      address: "רחוב הרצל 42, תל אביב",
      notes: "לקוחה קבועה, מעדיפה סגנון מודרני מינימליסטי. תקציב גמיש. בעל מעורב בהחלטות.",
    },
  });

  const client2 = await prisma.crmClient.create({
    data: {
      designerId: demoDesigner.id,
      name: "יוסי ומיכל לוי",
      phone: "052-9876543",
      email: "levi.family@example.com",
      address: "שדרות רוטשילד 15, רמת גן",
      notes: "זוג צעיר, דירה חדשה מקבלן. מעוניינים בעיצוב סקנדינבי. תקציב מוגבל.",
    },
  });

  const client3 = await prisma.crmClient.create({
    data: {
      designerId: demoDesigner.id,
      name: "דנה אברהם",
      phone: "050-5555123",
      email: "dana.a@example.com",
      address: "נחלת בנימין 8, תל אביב",
      notes: "מעוניינת בשיפוץ מטבח בלבד. סגנון תעשייתי. מאוד מדויקת בפרטים.",
    },
  });

  console.log(`✅ Created 3 demo CRM clients`);

  // ==========================================
  // פרויקטים — Demo Projects with phases & tasks
  // ==========================================
  const project1 = await prisma.crmProject.create({
    data: {
      designerId: demoDesigner.id,
      clientId: client1.id,
      name: "שיפוץ דירת 4 חדרים — הרצל 42",
      projectType: "RENOVATION",
      status: "ACTIVE",
      estimatedBudget: 280000,
      address: "רחוב הרצל 42, תל אביב",
      notes: "שיפוץ מלא כולל מטבח, 2 חדרי אמבטיה, סלון וחדרי שינה. סגנון מודרני עם נגיעות חמימות.",
      startDate: new Date("2026-02-01"),
      endDate: new Date("2026-06-30"),
      phases: {
        create: [
          { name: "ייעוץ ראשוני", sortOrder: 0, isCurrent: false, isCompleted: true, startedAt: new Date("2026-02-01"), completedAt: new Date("2026-02-10") },
          { name: "תכנון ועיצוב", sortOrder: 1, isCurrent: false, isCompleted: true, startedAt: new Date("2026-02-10"), completedAt: new Date("2026-02-28") },
          { name: "בחירת חומרים", sortOrder: 2, isCurrent: true, isCompleted: false, startedAt: new Date("2026-03-01") },
          { name: "הריסות ושלד", sortOrder: 3, isCurrent: false, isCompleted: false },
          { name: "אינסטלציה וחשמל", sortOrder: 4, isCurrent: false, isCompleted: false },
          { name: "טיח וריצוף", sortOrder: 5, isCurrent: false, isCompleted: false },
          { name: "נגרות ומטבח", sortOrder: 6, isCurrent: false, isCompleted: false },
          { name: "צבע וגמרים", sortOrder: 7, isCurrent: false, isCompleted: false },
          { name: "ריהוט ואביזרים", sortOrder: 8, isCurrent: false, isCompleted: false },
          { name: "מסירה", sortOrder: 9, isCurrent: false, isCompleted: false },
        ],
      },
      tasks: {
        create: [
          { title: "פגישת היכרות עם הלקוחות", status: "DONE", sortOrder: 0, completedAt: new Date("2026-02-02") },
          { title: "מדידת הדירה", status: "DONE", sortOrder: 1, completedAt: new Date("2026-02-05") },
          { title: "הכנת תכנית אדריכלית", status: "DONE", sortOrder: 2, completedAt: new Date("2026-02-15") },
          { title: "הכנת לוח השראה", status: "DONE", sortOrder: 3, completedAt: new Date("2026-02-18") },
          { title: "אישור תכנית מול הלקוחות", status: "DONE", sortOrder: 4, completedAt: new Date("2026-02-25") },
          { title: "בחירת אריחים לחדרי אמבטיה", status: "IN_PROGRESS", sortOrder: 5, dueDate: new Date("2026-03-22"), assignee: "רונית" },
          { title: "בחירת שיש למטבח", status: "IN_PROGRESS", sortOrder: 6, dueDate: new Date("2026-03-25"), assignee: "נועה" },
          { title: "הזמנת מטבח מקיטשן פלוס", status: "TODO", sortOrder: 7, dueDate: new Date("2026-04-01"), assignee: "נועה" },
          { title: "קבלת הצעת מחיר מקבלן שלד", status: "TODO", sortOrder: 8, dueDate: new Date("2026-03-28") },
          { title: "בחירת ברזים וכלים סניטריים", status: "TODO", sortOrder: 9, dueDate: new Date("2026-03-30"), assignee: "רונית" },
          { title: "הזמנת דלתות פנים", status: "TODO", sortOrder: 10, dueDate: new Date("2026-04-05") },
          { title: "בחירת גופי תאורה", status: "TODO", sortOrder: 11, dueDate: new Date("2026-04-10"), assignee: "נועה" },
          { title: "תכנון ארונות קיר", status: "TODO", sortOrder: 12, dueDate: new Date("2026-04-15") },
        ],
      },
      messages: {
        create: [
          { senderType: "designer", content: "שלום רונית ואבי! שמחה להתחיל איתכם את הפרויקט. מצורפת תכנית ראשונית.", isRead: true, createdAt: new Date("2026-02-10") },
          { senderType: "client", content: "תודה נועה! הכל נראה מעולה. יש לנו כמה שאלות על תכנית המטבח.", isRead: true, createdAt: new Date("2026-02-11") },
          { senderType: "designer", content: "בוודאי! נקבע שיחה מחר? אשמח להסביר את כל האפשרויות.", isRead: true, createdAt: new Date("2026-02-11") },
          { senderType: "designer", content: "שלחתי אליכם דוגמאות אריחים. מה דעתכם על הגוון השלישי?", isRead: false, createdAt: new Date("2026-03-15") },
        ],
      },
    },
  });

  const project2 = await prisma.crmProject.create({
    data: {
      designerId: demoDesigner.id,
      clientId: client2.id,
      name: "עיצוב דירה חדשה — רוטשילד 15",
      projectType: "HOME_STYLING",
      status: "ACTIVE",
      estimatedBudget: 150000,
      address: "שדרות רוטשילד 15, רמת גן",
      notes: "דירת 3 חדרים חדשה מקבלן. עיצוב מלא כולל ריהוט ואביזרים. סגנון סקנדינבי.",
      startDate: new Date("2026-03-01"),
      endDate: new Date("2026-07-31"),
      phases: {
        create: [
          { name: "ייעוץ ראשוני", sortOrder: 0, isCurrent: false, isCompleted: true, startedAt: new Date("2026-03-01"), completedAt: new Date("2026-03-07") },
          { name: "תכנון ועיצוב", sortOrder: 1, isCurrent: true, isCompleted: false, startedAt: new Date("2026-03-08") },
          { name: "בחירת חומרי גמר", sortOrder: 2, isCurrent: false, isCompleted: false },
          { name: "הזמנת ריהוט", sortOrder: 3, isCurrent: false, isCompleted: false },
          { name: "התקנות", sortOrder: 4, isCurrent: false, isCompleted: false },
          { name: "סטיילינג ומסירה", sortOrder: 5, isCurrent: false, isCompleted: false },
        ],
      },
      tasks: {
        create: [
          { title: "פגישת היכרות", status: "DONE", sortOrder: 0, completedAt: new Date("2026-03-02") },
          { title: "סיור בדירה + מדידות", status: "DONE", sortOrder: 1, completedAt: new Date("2026-03-05") },
          { title: "הכנת קונספט עיצובי", status: "IN_PROGRESS", sortOrder: 2, dueDate: new Date("2026-03-25"), assignee: "נועה" },
          { title: "הכנת רשימת ריהוט", status: "TODO", sortOrder: 3, dueDate: new Date("2026-04-01") },
          { title: "בחירת פרקט/שיש", status: "TODO", sortOrder: 4, dueDate: new Date("2026-04-05"), assignee: "מיכל" },
          { title: "תכנון תאורה", status: "TODO", sortOrder: 5, dueDate: new Date("2026-04-10") },
        ],
      },
      messages: {
        create: [
          { senderType: "designer", content: "שלום יוסי ומיכל! ברוכים הבאים לתהליך. אשמח להתחיל עם סיור בדירה.", isRead: true, createdAt: new Date("2026-03-01") },
          { senderType: "client", content: "תודה! אנחנו מתרגשים! מתי נוח לך לבוא?", isRead: true, createdAt: new Date("2026-03-02") },
        ],
      },
    },
  });

  await prisma.crmProject.create({
    data: {
      designerId: demoDesigner.id,
      clientId: client3.id,
      name: "שיפוץ מטבח — נחלת בנימין 8",
      projectType: "RENOVATION",
      status: "ACTIVE",
      estimatedBudget: 85000,
      address: "נחלת בנימין 8, תל אביב",
      notes: "שיפוץ מטבח בסגנון תעשייתי. ברזל שחור, בטון ועץ אלון.",
      startDate: new Date("2026-03-10"),
      phases: {
        create: [
          { name: "ייעוץ ראשוני", sortOrder: 0, isCurrent: true, isCompleted: false, startedAt: new Date("2026-03-10") },
          { name: "תכנון מטבח", sortOrder: 1, isCurrent: false, isCompleted: false },
          { name: "בחירת חומרים", sortOrder: 2, isCurrent: false, isCompleted: false },
          { name: "הריסה והכנה", sortOrder: 3, isCurrent: false, isCompleted: false },
          { name: "התקנת מטבח", sortOrder: 4, isCurrent: false, isCompleted: false },
          { name: "גמרים ומסירה", sortOrder: 5, isCurrent: false, isCompleted: false },
        ],
      },
      tasks: {
        create: [
          { title: "פגישת ייעוץ ראשונית", status: "DONE", sortOrder: 0, completedAt: new Date("2026-03-10") },
          { title: "מדידת מטבח קיים", status: "IN_PROGRESS", sortOrder: 1, dueDate: new Date("2026-03-20"), assignee: "נועה" },
          { title: "הכנת תכנית מטבח", status: "TODO", sortOrder: 2, dueDate: new Date("2026-03-28") },
          { title: "קבלת הצעת מחיר מנגר", status: "TODO", sortOrder: 3, dueDate: new Date("2026-04-01") },
        ],
      },
    },
  });

  console.log(`✅ Created 3 demo projects with phases, tasks & messages`);

  // ==========================================
  // פריטי תקציב — Demo Budget Items (project 1)
  // ==========================================
  await prisma.crmBudgetItem.createMany({
    data: [
      { projectId: project1.id, designerId: demoDesigner.id, category: "מטבח", description: "מטבח מותאם אישית — קיטשן פלוס", plannedAmount: 55000, actualAmount: 52000, status: "approved", supplierName: "קיטשן פלוס" },
      { projectId: project1.id, designerId: demoDesigner.id, category: "ריצוף וחיפוי", description: "אריחי פורצלן — סלון + מטבח + חדרי אמבטיה", plannedAmount: 35000, actualAmount: 0, status: "quoted", supplierName: "סטון דיזיין" },
      { projectId: project1.id, designerId: demoDesigner.id, category: "אינסטלציה", description: "צנרת + כלים סניטריים", plannedAmount: 28000, actualAmount: 0, status: "planned" },
      { projectId: project1.id, designerId: demoDesigner.id, category: "חשמל", description: "חשמל + תאורה שקועה", plannedAmount: 22000, actualAmount: 0, status: "planned" },
      { projectId: project1.id, designerId: demoDesigner.id, category: "נגרות", description: "ארונות קיר + ארון אמבטיה", plannedAmount: 38000, actualAmount: 0, status: "planned" },
      { projectId: project1.id, designerId: demoDesigner.id, category: "צבע", description: "צביעת כל הדירה", plannedAmount: 12000, actualAmount: 0, status: "planned" },
      { projectId: project1.id, designerId: demoDesigner.id, category: "תאורה", description: "גופי תאורה — אור תאורה", plannedAmount: 18000, actualAmount: 0, status: "quoted", supplierName: "אור תאורה" },
      { projectId: project1.id, designerId: demoDesigner.id, category: "קבלן שלד", description: "הריסות + בניה + טיח", plannedAmount: 45000, actualAmount: 0, status: "planned" },
      { projectId: project1.id, designerId: demoDesigner.id, category: "דלתות", description: "6 דלתות פנים + דלת כניסה", plannedAmount: 15000, actualAmount: 0, status: "planned" },
      { projectId: project1.id, designerId: demoDesigner.id, category: "ריהוט", description: "ספה + שולחן אוכל + כסאות", plannedAmount: 25000, actualAmount: 0, status: "planned" },
    ],
  });

  console.log(`✅ Created 10 demo budget items`);

  // ==========================================
  // בלוקי לוז — Demo Schedule Blocks (project 1)
  // ==========================================
  await prisma.crmScheduleBlock.createMany({
    data: [
      { projectId: project1.id, designerId: demoDesigner.id, title: "הריסות", startDate: new Date("2026-04-01"), endDate: new Date("2026-04-07"), durationDays: 7, status: "pending", color: "#EF4444", sortOrder: 0 },
      { projectId: project1.id, designerId: demoDesigner.id, title: "אינסטלציה", startDate: new Date("2026-04-08"), endDate: new Date("2026-04-18"), durationDays: 10, status: "pending", color: "#3B82F6", supplierName: "שלמה אינסטלציה", supplierPhone: "050-1111111", sortOrder: 1 },
      { projectId: project1.id, designerId: demoDesigner.id, title: "חשמל", startDate: new Date("2026-04-08"), endDate: new Date("2026-04-15"), durationDays: 7, status: "pending", color: "#F59E0B", supplierName: "חשמל גלעד", supplierPhone: "050-2222222", sortOrder: 2 },
      { projectId: project1.id, designerId: demoDesigner.id, title: "טיח", startDate: new Date("2026-04-19"), endDate: new Date("2026-04-25"), durationDays: 6, status: "pending", color: "#8B5CF6", sortOrder: 3 },
      { projectId: project1.id, designerId: demoDesigner.id, title: "ריצוף", startDate: new Date("2026-04-26"), endDate: new Date("2026-05-08"), durationDays: 12, status: "pending", color: "#10B981", supplierName: "סטון דיזיין", sortOrder: 4 },
      { projectId: project1.id, designerId: demoDesigner.id, title: "התקנת מטבח", startDate: new Date("2026-05-10"), endDate: new Date("2026-05-20"), durationDays: 10, status: "pending", color: "#EC4899", supplierName: "קיטשן פלוס", sortOrder: 5 },
      { projectId: project1.id, designerId: demoDesigner.id, title: "נגרות", startDate: new Date("2026-05-12"), endDate: new Date("2026-05-25"), durationDays: 13, status: "pending", color: "#D97706", sortOrder: 6 },
      { projectId: project1.id, designerId: demoDesigner.id, title: "צבע", startDate: new Date("2026-05-26"), endDate: new Date("2026-06-02"), durationDays: 7, status: "pending", color: "#6366F1", sortOrder: 7 },
      { projectId: project1.id, designerId: demoDesigner.id, title: "תאורה ואביזרים", startDate: new Date("2026-06-03"), endDate: new Date("2026-06-10"), durationDays: 7, status: "pending", color: "#14B8A6", sortOrder: 8 },
      { projectId: project1.id, designerId: demoDesigner.id, title: "ריהוט וסטיילינג", startDate: new Date("2026-06-15"), endDate: new Date("2026-06-25"), durationDays: 10, status: "pending", color: "#F97316", sortOrder: 9 },
    ],
  });

  console.log(`✅ Created 10 demo schedule blocks`);

  // ==========================================
  // אירועי יומן — Demo Calendar Events
  // ==========================================
  await prisma.crmCalendarEvent.createMany({
    data: [
      { designerId: demoDesigner.id, clientId: client1.id, title: "פגישה עם רונית — בחירת אריחים", description: "לקחת דוגמאות מסטון דיזיין", startAt: new Date("2026-03-22T10:00:00"), endAt: new Date("2026-03-22T11:30:00"), location: "אולם תצוגה — סטון דיזיין, תל אביב" },
      { designerId: demoDesigner.id, clientId: client2.id, title: "סיור בדירה — יוסי ומיכל", description: "מדידות סופיות + צילום", startAt: new Date("2026-03-24T14:00:00"), endAt: new Date("2026-03-24T16:00:00"), location: "רוטשילד 15, רמת גן" },
      { designerId: demoDesigner.id, clientId: client3.id, title: "פגישה טלפונית — דנה", description: "סיכום קונספט מטבח", startAt: new Date("2026-03-25T09:00:00"), endAt: new Date("2026-03-25T09:30:00") },
    ],
  });

  console.log(`✅ Created 3 demo calendar events`);

  console.log("\n🎉 Seeding complete!\n");
  printCredentials();

  await prisma.$disconnect();
  await pool.end();
}

function printCredentials() {
  console.log("══════════════════════════════════════════");
  console.log("   📋 פרטי כניסה למערכת");
  console.log("══════════════════════════════════════════");
  console.log("");
  console.log("  👑 אדמין:");
  console.log("     אימייל: tamar@zirat.co.il");
  console.log("     סיסמה:  Zirat2024!");
  console.log("");
  console.log("  🏪 ספק (דוגמה):");
  console.log("     אימייל: supplier@zirat.co.il");
  console.log("     סיסמה:  Supplier123!");
  console.log("");
  console.log("  🎨 מעצבת (דוגמה):");
  console.log("     אימייל: designer@zirat.co.il");
  console.log("     סיסמה:  Designer123!");
  console.log("");
  console.log("══════════════════════════════════════════\n");
}

main().catch((e) => {
  console.error("❌ Seeding error:", e);
  process.exit(1);
});
