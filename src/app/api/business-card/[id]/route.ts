export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    return NextResponse.json({
      card: card
        ? {
            fields: card.fields,
            socialLinks: card.socialLinks,
            galleryImages: card.galleryImages,
            testimonials: card.testimonials,
            themeId: card.themeId,
            customColors: card.customColors,
            title: card.title,
            subtitle: card.subtitle,
            avatarUrl: card.avatarUrl,
            logoUrl: card.logoUrl,
            headingFontId: card.headingFontId,
            bodyFontId: card.bodyFontId,
            headerBgImage: card.headerBgImage,
          }
        : null,
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

    // Determine if this is a designer or supplier
    const designer = await prisma.designer.findUnique({ where: { id }, select: { id: true } });
    const ownerField = designer
      ? { designerId: id }
      : { supplierId: id };
    const uniqueField = designer
      ? { designerId: id }
      : { supplierId: id };

    const card = await prisma.businessCard.upsert({
      where: uniqueField,
      create: {
        ...ownerField,
        fields: fields || [],
        socialLinks: socialLinks || [],
        galleryImages: galleryImages || [],
        testimonials: testimonials || [],
        themeId: themeId || "elegant-gold",
        customColors: customColors || null,
        title, subtitle, avatarUrl, logoUrl,
        headingFontId, bodyFontId, headerBgImage,
      },
      update: {
        fields: fields || [],
        socialLinks: socialLinks || [],
        galleryImages: galleryImages || [],
        testimonials: testimonials || [],
        themeId: themeId || "elegant-gold",
        customColors: customColors || null,
        title, subtitle, avatarUrl, logoUrl,
        headingFontId, bodyFontId, headerBgImage,
      },
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
