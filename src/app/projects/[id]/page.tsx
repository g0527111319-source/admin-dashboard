// Server component for public project detail page.
//
// - Exports generateMetadata() for OG / Twitter / title tags.
// - Renders JSON-LD (schema.org/CreativeWork) inline.
// - Delegates the interactive UI to ProjectDetailClient ("use client").

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import ProjectDetailClient, {
  type PublicProject,
} from "./ProjectDetailClient";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://www.ziratadrichalut.co.il"
).trim();

async function loadProject(id: string): Promise<PublicProject | null> {
  try {
    const project = await prisma.designerProject.findUnique({
      where: { id },
      include: {
        designer: {
          select: {
            id: true,
            fullName: true,
            city: true,
            area: true,
            specialization: true,
            instagram: true,
            website: true,
            crmSettings: {
              select: { logoUrl: true, companyName: true },
            },
          },
        },
        images: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!project || project.status !== "public") return null;
    // Normalize Dates → ISO strings so the shape matches PublicProject.
    return {
      id: project.id,
      title: project.title,
      description: project.description,
      category: project.category,
      styleTags: project.styleTags,
      coverImageUrl: project.coverImageUrl,
      status: project.status,
      suppliers: project.suppliers,
      createdAt: project.createdAt.toISOString(),
      designer: project.designer,
      images: project.images.map((img) => ({
        id: img.id,
        imageUrl: img.imageUrl,
        caption: img.caption,
        sortOrder: img.sortOrder,
      })),
    };
  } catch (err) {
    console.error("[projects/[id]] loadProject failed", err);
    return null;
  }
}

function absoluteUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${SITE_URL}${url}`;
  return `${SITE_URL}/${url}`;
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const project = await loadProject(params.id);
  if (!project) {
    return {
      title: "פרויקט לא נמצא | זירת האדריכלות",
      description: "הפרויקט המבוקש אינו זמין לצפייה ציבורית.",
    };
  }
  const designerName = project.designer.fullName;
  const rawDescription =
    project.description ||
    `פרויקט עיצוב פנים של ${designerName} — ${project.designer.city || "ישראל"}`;
  const description = rawDescription.replace(/\s+/g, " ").trim().slice(0, 160);
  const cover =
    absoluteUrl(project.coverImageUrl) ||
    absoluteUrl(project.images[0]?.imageUrl) ||
    `${SITE_URL}/logo.png`;

  const title = `${project.title} · ${designerName} | זירת האדריכלות`;
  const ogTitle = `${project.title} · ${designerName}`;

  return {
    title,
    description,
    openGraph: {
      title: ogTitle,
      description,
      images: [
        { url: cover, width: 1200, height: 630, alt: project.title },
      ],
      type: "article",
      locale: "he_IL",
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [cover],
    },
    alternates: {
      canonical: `${SITE_URL}/projects/${project.id}`,
    },
  };
}

export default async function ProjectPage({
  params,
}: {
  params: { id: string };
}) {
  const project = await loadProject(params.id);
  if (!project) notFound();

  const cover =
    absoluteUrl(project.coverImageUrl) ||
    absoluteUrl(project.images[0]?.imageUrl) ||
    undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title,
    description: project.description || undefined,
    image: cover,
    creator: {
      "@type": "Person",
      name: project.designer.fullName,
      jobTitle: "מעצבת פנים",
      address: project.designer.city || undefined,
    },
    inLanguage: "he-IL",
    dateCreated: project.createdAt,
    url: `${SITE_URL}/projects/${project.id}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProjectDetailClient initialProject={project} />
    </>
  );
}
