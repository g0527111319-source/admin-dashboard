// Server entry for /projects — handles metadata (generic gallery or a
// specific designer's portfolio when ?designer=<id> is present) and
// emits schema.org/Person JSON-LD in designer mode. All interactive
// behavior lives in ProjectsGalleryClient.

import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import ProjectsGalleryClient from "./ProjectsGalleryClient";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://www.ziratadrichalut.co.il"
).trim();

type PageProps = {
  searchParams?: { [key: string]: string | string[] | undefined };
};

function firstString(v: string | string[] | undefined): string | null {
  if (!v) return null;
  if (Array.isArray(v)) return v[0] ?? null;
  return v;
}

async function loadDesigner(id: string) {
  try {
    return await prisma.designer.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        city: true,
        area: true,
        specialization: true,
        crmSettings: {
          select: { logoUrl: true, companyName: true, tagline: true },
        },
      },
    });
  } catch (err) {
    console.error("[projects] loadDesigner failed", err);
    return null;
  }
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const designerId = firstString(searchParams?.designer);

  if (designerId) {
    const designer = await loadDesigner(designerId);
    if (designer) {
      const title = `${designer.fullName} · תיק עבודות | זירת האדריכלות`;
      const description = (
        designer.crmSettings?.tagline || `תיק עבודות של ${designer.fullName}`
      )
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 160);
      const logo = designer.crmSettings?.logoUrl || `${SITE_URL}/logo.png`;
      return {
        title,
        description,
        openGraph: {
          title: `${designer.fullName} · תיק עבודות`,
          description,
          images: [{ url: logo, width: 1200, height: 630, alt: designer.fullName }],
          type: "profile",
          locale: "he_IL",
        },
        twitter: {
          card: "summary_large_image",
          title: `${designer.fullName} · תיק עבודות`,
          description,
          images: [logo],
        },
        alternates: {
          canonical: `${SITE_URL}/projects?designer=${designer.id}`,
        },
      };
    }
  }

  return {
    title: "גלריית פרויקטים | זירת האדריכלות",
    description:
      "גלריית פרויקטים של מעצבות פנים ואדריכליות בקהילת זירת האדריכלות — עבודות אמיתיות מכל הארץ.",
    openGraph: {
      title: "גלריית פרויקטים | זירת האדריכלות",
      description:
        "גלריית פרויקטים של מעצבות פנים ואדריכליות בקהילת זירת האדריכלות.",
      type: "website",
      locale: "he_IL",
    },
    alternates: { canonical: `${SITE_URL}/projects` },
  };
}

export default async function ProjectsPage({ searchParams }: PageProps) {
  const designerId = firstString(searchParams?.designer);
  let designerJsonLd: Record<string, unknown> | null = null;

  if (designerId) {
    const designer = await loadDesigner(designerId);
    if (designer) {
      designerJsonLd = {
        "@context": "https://schema.org",
        "@type": "Person",
        name: designer.fullName,
        jobTitle: "מעצבת פנים",
        address: designer.city || designer.area || undefined,
        description: designer.crmSettings?.tagline || undefined,
        image: designer.crmSettings?.logoUrl || undefined,
        worksFor: designer.crmSettings?.companyName
          ? {
              "@type": "Organization",
              name: designer.crmSettings.companyName,
            }
          : undefined,
        url: `${SITE_URL}/projects?designer=${designer.id}`,
        inLanguage: "he-IL",
      };
    }
  }

  return (
    <>
      {designerJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(designerJsonLd) }}
        />
      )}
      <ProjectsGalleryClient />
    </>
  );
}
