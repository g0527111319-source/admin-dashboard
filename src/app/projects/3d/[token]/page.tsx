// Public 3D viewer page. Lives under /projects/* so the middleware's
// existing public-path rule for /projects covers it — no middleware edits.
// All client interaction (viewer, pin placement, thread polling) happens
// in ViewerClient; this file only does SEO metadata.

import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import ViewerClient from "./ViewerClient";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://www.ziratadrichalut.co.il"
).trim();

type PageProps = {
  params: { token: string };
};

async function loadModel(token: string) {
  try {
    return await prisma.model3D.findUnique({
      where: { shareToken: token },
      select: {
        id: true,
        title: true,
        project: {
          select: {
            title: true,
            designer: { select: { fullName: true, id: true } },
          },
        },
      },
    });
  } catch (err) {
    console.error("[3d page] loadModel failed", err);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const model = await loadModel(params.token);
  if (!model) {
    return { title: "מודל לא נמצא | זירת האדריכלות" };
  }
  const projectTitle = model.project.title || model.title || "פרויקט";
  const designerName = model.project.designer.fullName;
  const title = `${projectTitle} · צפייה בתלת מימד | ${designerName}`;
  const description = `סיור וירטואלי בפרויקט של ${designerName}. הוסיפו הערות ישירות על המודל.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      locale: "he_IL",
    },
    // Intentionally robots: noindex — share tokens are secret, we don't
    // want them crawled.
    robots: { index: false, follow: false },
    alternates: { canonical: `${SITE_URL}/projects/3d/${params.token}` },
  };
}

export default function ModelSharePage({ params }: PageProps) {
  return <ViewerClient token={params.token} />;
}
