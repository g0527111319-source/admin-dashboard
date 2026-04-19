import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getAllPostSlugs, getPostBySlug } from "@/lib/blog";

interface Props {
  params: { slug: string };
}

export const revalidate = 3600;

export async function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getPostBySlug(params.slug);
  if (!post) return { title: "מאמר לא נמצא" };
  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url: `/blog/${post.slug}`,
      publishedTime: post.date,
      authors: [post.author || "זירת האדריכלות"],
      images: post.cover ? [{ url: post.cover }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: post.cover ? [post.cover] : undefined,
    },
  };
}

export default function BlogPostPage({ params }: Props) {
  const post = getPostBySlug(params.slug);
  if (!post) notFound();

  // .trim() defends against env vars saved with trailing \n.
  const SITE_URL =
    (process.env.NEXT_PUBLIC_APP_URL || "https://www.ziratadrichalut.co.il").trim();

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    author: { "@type": "Organization", name: post.author || "זירת האדריכלות" },
    publisher: {
      "@type": "Organization",
      name: "זירת האדריכלות",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png` },
    },
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
    image: post.cover ? `${SITE_URL}${post.cover}` : `${SITE_URL}/logo.png`,
    keywords: post.keywords.join(", "),
    inLanguage: "he-IL",
  };

  return (
    <main className="min-h-screen bg-bg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <article className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
        <nav aria-label="breadcrumb" className="mb-8 text-sm text-text-muted">
          <Link href="/" className="hover:text-gold">בית</Link>
          {" / "}
          <Link href="/blog" className="hover:text-gold">בלוג</Link>
          {" / "}
          <span className="text-text-secondary">{post.title}</span>
        </nav>

        <header className="mb-10 border-b border-border-subtle pb-8">
          <time className="text-xs text-text-muted" dateTime={post.date}>
            {new Date(post.date).toLocaleDateString("he-IL", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            {" · "}
            {post.readingMinutes} דק׳ קריאה
          </time>
          <h1 className="mt-3 font-heading text-4xl leading-tight text-text-primary sm:text-5xl">
            {post.title}
          </h1>
          <p className="mt-4 text-lg text-text-secondary">{post.description}</p>
        </header>

        <div
          className="prose prose-lg max-w-none text-text-primary prose-headings:font-heading prose-headings:text-text-primary prose-a:text-gold prose-strong:text-text-primary"
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />

        <footer className="mt-16 border-t border-border-subtle pt-8 text-sm text-text-muted">
          <Link href="/blog" className="text-gold hover:underline">
            ← חזרה לבלוג
          </Link>
        </footer>
      </article>
    </main>
  );
}
