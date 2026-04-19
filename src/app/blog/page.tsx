import type { Metadata } from "next";
import Link from "next/link";
import { getAllPostsMeta } from "@/lib/blog";
import { Eyebrow } from "@/components/ds";

export const metadata: Metadata = {
  title: "הבלוג | טיפים, מגמות ותובנות לעיצוב פנים ואדריכלות",
  description:
    "מאמרים מקצועיים על עיצוב פנים, אדריכלות פנים, שיפוץ דירות, בחירת מעצבת, מגמות עיצוב בישראל וטיפים עסקיים למעצבות. עדכונים שבועיים מקהילת זירת האדריכלות.",
  keywords: [
    "בלוג עיצוב פנים",
    "מאמרים אדריכלות פנים",
    "טיפים עיצוב",
    "מגמות עיצוב 2026",
    "איך לבחור מעצבת פנים",
    "שיפוץ דירה",
  ],
  alternates: { canonical: "/blog" },
  openGraph: {
    type: "website",
    title: "הבלוג — זירת האדריכלות",
    description: "טיפים, מגמות ותובנות לעיצוב פנים ואדריכלות.",
    url: "/blog",
  },
};

export const revalidate = 3600; // שעה

export default function BlogIndexPage() {
  const posts = getAllPostsMeta();

  return (
    <main className="min-h-screen bg-bg">
      <section className="mx-auto max-w-4xl px-6 py-16 sm:py-24">
        <header className="mb-12 text-center">
          <Eyebrow className="mb-3 inline-block">הבלוג</Eyebrow>
          <h1 className="font-heading text-4xl sm:text-5xl text-text-primary">
            טיפים, מגמות ותובנות לעיצוב פנים ואדריכלות
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-text-secondary">
            מאמרים שנכתבו במיוחד למעצבות פנים, אדריכליות ובעלות עסקים בתחום העיצוב —
            איך להביא יותר לקוחות, איך לתמחר נכון, ומה הכי חדש בעולם העיצוב בישראל.
          </p>
        </header>

        {posts.length === 0 ? (
          <p className="text-center text-text-muted">בקרוב — מאמרים חדשים.</p>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2">
            {posts.map((post) => (
              <li
                key={post.slug}
                className="rounded-card border border-border-subtle bg-bg-card p-6 shadow-card transition hover:shadow-card-hover"
              >
                <Link href={`/blog/${post.slug}`} className="block">
                  <time className="text-xs text-text-muted" dateTime={post.date}>
                    {new Date(post.date).toLocaleDateString("he-IL", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                    {" · "}
                    {post.readingMinutes} דק׳ קריאה
                  </time>
                  <h2 className="mt-2 font-heading text-xl text-text-primary">
                    {post.title}
                  </h2>
                  <p className="mt-2 text-sm text-text-secondary line-clamp-3">
                    {post.description}
                  </p>
                  <span className="mt-4 inline-block text-sm text-gold">
                    קראי עוד ←
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
