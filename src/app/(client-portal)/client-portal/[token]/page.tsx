import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import type { Metadata } from "next";

type PageProps = {
  params: Promise<{ token: string }>;
};

// Dynamic OG metadata for WhatsApp link preview
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;

  let designerLogo: string | null = null;
  let companyName: string | null = null;

  try {
    const portalToken = await prisma.clientPortalToken.findUnique({
      where: { token },
      include: {
        client: {
          include: {
            designer: {
              include: {
                crmSettings: true,
              },
            },
          },
        },
      },
    });

    if (portalToken?.client?.designer?.crmSettings) {
      designerLogo = portalToken.client.designer.crmSettings.logoUrl;
      companyName = portalToken.client.designer.crmSettings.companyName;
    }
  } catch {
    // Fallback to defaults
  }

  const title = companyName
    ? `${companyName} | אזור אישי`
    : "זירת האדריכלות | אזור אישי";

  const ogImages = designerLogo
    ? [{ url: designerLogo, width: 400, height: 400 }]
    : [{ url: "/logo.png", width: 400, height: 400 }];

  return {
    title,
    description: "הצטרף/י לאזור האישי שלך",
    openGraph: {
      title: companyName || "זירת האדריכלות",
      description: "הצטרף/י לאזור האישי שלך",
      images: ogImages,
      type: "website",
      locale: "he_IL",
    },
  };
}

export default async function ClientPortalEntry({ params }: PageProps) {
  const { token } = await params;

  // Validate token exists and is active
  let valid = false;
  let isArchived = false;
  try {
    const portalToken = await prisma.clientPortalToken.findUnique({
      where: { token },
      include: { client: true },
    });

    if (portalToken && portalToken.isActive && !portalToken.client.deletedAt) {
      // Check if client is archived
      if ((portalToken.client as Record<string, unknown>).isArchived === true) {
        isArchived = true;
      } else {
        valid = true;

        // Update last used timestamp
        await prisma.clientPortalToken.update({
          where: { id: portalToken.id },
          data: { lastUsedAt: new Date() },
        });
      }
    }
  } catch {
    // Token invalid
  }

  // Archived client — show completed message
  if (isArchived) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-md w-full text-center">
          <div className="text-5xl mb-6">🏠</div>
          <h1 className="text-2xl font-heading text-text-primary mb-3">הפרויקט הסתיים</h1>
          <p className="text-text-muted text-lg">תודה שבחרת בנו!</p>
          <p className="text-text-faint text-sm mt-4">האזור האישי אינו פעיל עוד. לשאלות ניתן ליצור קשר ישירות עם המעצב/ת.</p>
        </div>
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 className="text-2xl font-heading text-text-primary mb-2">שגיאה</h1>
          <p className="text-text-muted">הקישור אינו תקין או שפג תוקפו</p>
        </div>
      </div>
    );
  }

  // Token is valid — redirect directly to the dashboard
  redirect(`/client-portal/${token}/dashboard`);
}
