export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// All extra fields stored in the extraData JSON column
const EXTRA_KEYS = [
  "logoSize", "showQrCode", "qrCodeUrl", "videoUrl", "entryAnimation",
  "darkMode", "businessHours", "showBusinessHours", "expertiseTags",
  "beforeAfterItems", "professionalStats", "showStats", "showVCard",
  "businessAddress", "showMapButton",
] as const;

// GET /api/business-card/[id] — Public: fetch business card by designer/supplier ID
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Try to find business card by designerId
    let card = await prisma.businessCard.findUnique({
      where: { designerId: id },
    });

    // If not found, try supplierId
    if (!card) {
      card = await prisma.businessCard.findUnique({
        where: { supplierId: id },
      });
    }

    // Fetch the designer/supplier profile for fallback data
    let profile: { fullName: string; specialization?: string | null; phone: string; email?: string | null } | null = null;
    let profileType: "designer" | "supplier" = "designer";

    const designer = await prisma.designer.findUnique({
      where: { id },
      select: { fullName: true, specialization: true, phone: true, email: true },
    });

    if (designer) {
      profile = designer;
      profileType = "designer";
    } else {
      const supplier = await prisma.supplier.findUnique({
        where: { id },
        select: { contactName: true, category: true, phone: true, email: true },
      });
      if (supplier) {
        profile = {
          fullName: supplier.contactName,
          specialization: supplier.category,
          phone: supplier.phone,
          email: supplier.email,
        };
        profileType = "supplier";
      }
    }

    if (!profile) {
      return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
    }

    // Fetch published reviews and merge them into the card's testimonials.
    // Hand-curated testimonials (from the card builder) appear first;
    // review-sourced entries appear after.
    //   - Designers: client satisfaction surveys (id prefix `survey:`)
    //   - Suppliers: designer reviews of the supplier (id prefix `sdr:`)
    let surveyTestimonials: Array<{ id: string; name: string; text: string }> = [];
    if (profileType === "designer") {
      const published = await prisma.crmSatisfactionSurvey.findMany({
        where: {
          publishedAt: { not: null },
          publishConsent: { in: ["ANONYMOUS", "FULL"] },
          freeTextComment: { not: null },
          project: { designerId: id, deletedAt: null },
        },
        orderBy: { publishedAt: "desc" },
        include: {
          client: { select: { name: true, firstName: true, lastName: true, phone: true } },
        },
      });

      surveyTestimonials = published
        .filter((s) => s.freeTextComment && s.freeTextComment.trim())
        .map((s) => {
          let displayName = "לקוח/ה";
          if (s.publishConsent === "FULL" && s.client) {
            const fullName = [s.client.firstName, s.client.lastName].filter(Boolean).join(" ").trim() || s.client.name || "לקוח/ה";
            displayName = s.client.phone ? `${fullName} · ${s.client.phone}` : fullName;
          }
          return {
            id: `survey:${s.id}`,
            name: displayName,
            text: s.freeTextComment!.trim(),
          };
        });
    } else if (profileType === "supplier") {
      const published = await prisma.supplierDesignerReview.findMany({
        where: {
          supplierId: id,
          publishedAt: { not: null },
          publishConsent: { in: ["ANONYMOUS", "FULL"] },
          freeTextComment: { not: null },
        },
        orderBy: { publishedAt: "desc" },
        include: {
          designer: { select: { fullName: true, firstName: true, lastName: true, phone: true } },
        },
      });

      surveyTestimonials = published
        .filter((r) => r.freeTextComment && r.freeTextComment.trim())
        .map((r) => {
          let displayName = "מעצבת";
          if (r.publishConsent === "FULL" && r.designer) {
            const fullName =
              [r.designer.firstName, r.designer.lastName].filter(Boolean).join(" ").trim() ||
              r.designer.fullName ||
              "מעצבת";
            displayName = r.designer.phone ? `${fullName} · ${r.designer.phone}` : fullName;
          }
          return {
            id: `sdr:${r.id}`,
            name: displayName,
            text: r.freeTextComment!.trim(),
          };
        });
    }

    // Merge extraData back into the card object for the client
    let cardData = null;
    if (card) {
      const extra = (card.extraData as Record<string, unknown>) || {};
      const existingTestimonials = (card.testimonials as Array<{ id: string; name: string; text: string }>) || [];
      cardData = {
        fields: card.fields,
        socialLinks: card.socialLinks,
        galleryImages: card.galleryImages,
        testimonials: [...existingTestimonials, ...surveyTestimonials],
        themeId: card.themeId,
        customColors: card.customColors,
        title: card.title,
        subtitle: card.subtitle,
        avatarUrl: card.avatarUrl,
        logoUrl: card.logoUrl,
        headingFontId: card.headingFontId,
        bodyFontId: card.bodyFontId,
        headerBgImage: card.headerBgImage,
        // Spread all extra fields back into the card
        ...extra,
      };
    } else if (surveyTestimonials.length > 0) {
      // No business card yet but there are published reviews — surface them
      // anyway so the testimonials appear as soon as the designer sets up
      // her card later.
      cardData = { testimonials: surveyTestimonials };
    }

    return NextResponse.json({
      card: cardData,
      profile,
      profileType,
    });
  } catch (error) {
    console.error("Business card fetch error:", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת כרטיס ביקור" },
      { status: 500 }
    );
  }
}

// PUT /api/business-card/[id] — Save business card (authenticated)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const userId = req.headers.get("x-user-id");

    // Only the owner can save their card
    if (!userId || userId !== id) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    const body = await req.json();
    const {
      fields, socialLinks, galleryImages, testimonials,
      themeId, customColors, title, subtitle,
      avatarUrl, logoUrl, headingFontId, bodyFontId, headerBgImage,
    } = body;

    // Collect all extra fields into a single JSON object
    const extraData: Record<string, unknown> = {};
    for (const key of EXTRA_KEYS) {
      if (body[key] !== undefined) {
        extraData[key] = body[key];
      }
    }

    // Determine if this is a designer or supplier
    const designer = await prisma.designer.findUnique({ where: { id }, select: { id: true } });
    const ownerField = designer
      ? { designerId: id }
      : { supplierId: id };
    const uniqueField = designer
      ? { designerId: id }
      : { supplierId: id };

    const saveData = {
      fields: fields || [],
      socialLinks: socialLinks || [],
      galleryImages: galleryImages || [],
      testimonials: testimonials || [],
      themeId: themeId || "elegant-gold",
      customColors: customColors || null,
      title, subtitle, avatarUrl, logoUrl,
      headingFontId, bodyFontId, headerBgImage,
      extraData: Object.keys(extraData).length > 0 ? extraData : undefined,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const card = await prisma.businessCard.upsert({
      where: uniqueField,
      create: { ...ownerField, ...saveData } as any,
      update: saveData as any,
    });

    return NextResponse.json({ success: true, id: card.id });
  } catch (error) {
    console.error("Business card save error:", error);
    return NextResponse.json(
      { error: "שגיאה בשמירת כרטיס ביקור" },
      { status: 500 }
    );
  }
}
