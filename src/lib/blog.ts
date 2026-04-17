import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

/**
 * File-based blog — זול, מהיר, בלי DB.
 * כל מאמר = קובץ .md ב-content/blog/ עם frontmatter:
 *
 *   ---
 *   title: "..."
 *   description: "..."
 *   date: "2026-04-17"
 *   keywords: ["...", "..."]
 *   cover: "/logo.png"
 *   author: "זירת האדריכלות"
 *   ---
 *   ...גוף המאמר ב-markdown...
 */

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

export interface BlogMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  keywords: string[];
  cover?: string;
  author?: string;
  readingMinutes: number;
}

export interface BlogPost extends BlogMeta {
  contentHtml: string;
  contentRaw: string;
}

function safeReadDir(): string[] {
  try {
    return fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }
}

function estimateReadingMinutes(text: string): number {
  // קצב קריאה ממוצע בעברית: ~200 מילים לדקה
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

export function getAllPostSlugs(): string[] {
  return safeReadDir().map((f) => f.replace(/\.md$/, ""));
}

export function getAllPostsMeta(): BlogMeta[] {
  const files = safeReadDir();
  const posts = files.map((filename) => {
    const slug = filename.replace(/\.md$/, "");
    const raw = fs.readFileSync(path.join(BLOG_DIR, filename), "utf8");
    const { data, content } = matter(raw);
    return {
      slug,
      title: String(data.title || slug),
      description: String(data.description || ""),
      date: String(data.date || new Date().toISOString().slice(0, 10)),
      keywords: Array.isArray(data.keywords) ? data.keywords.map(String) : [],
      cover: data.cover ? String(data.cover) : undefined,
      author: data.author ? String(data.author) : "זירת האדריכלות",
      readingMinutes: estimateReadingMinutes(content),
    } satisfies BlogMeta;
  });
  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPostBySlug(slug: string): BlogPost | null {
  const filePath = path.join(BLOG_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  const contentHtml = marked.parse(content, { async: false }) as string;
  return {
    slug,
    title: String(data.title || slug),
    description: String(data.description || ""),
    date: String(data.date || new Date().toISOString().slice(0, 10)),
    keywords: Array.isArray(data.keywords) ? data.keywords.map(String) : [],
    cover: data.cover ? String(data.cover) : undefined,
    author: data.author ? String(data.author) : "זירת האדריכלות",
    readingMinutes: estimateReadingMinutes(content),
    contentHtml,
    contentRaw: content,
  };
}
