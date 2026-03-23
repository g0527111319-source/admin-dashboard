import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import type { Metadata } from "next";
import { ClientPortalArchivedMessage, ClientPortalErrorMessage } from "@/components/ClientPortalStatusMessages";

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
    return <ClientPortalArchivedMessage />;
  }

  if (!valid) {
    return <ClientPortalErrorMessage />;
  }

  // Token is valid — redirect directly to the dashboard
  redirect(`/client-portal/${token}/dashboard`);
}
