export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  try {
    // Convert Google Drive URLs to direct download format
    let fetchUrl = url;
    const driveFileMatch = url.match(
      /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/
    );
    if (driveFileMatch) {
      fetchUrl = `https://drive.google.com/uc?export=view&id=${driveFileMatch[1]}`;
    }
    const driveUcMatch = url.match(
      /drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/
    );
    if (driveUcMatch) {
      fetchUrl = `https://drive.google.com/uc?export=view&id=${driveUcMatch[1]}`;
    }
    const driveOpenMatch = url.match(
      /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/
    );
    if (driveOpenMatch) {
      fetchUrl = `https://drive.google.com/uc?export=view&id=${driveOpenMatch[1]}`;
    }

    const response = await fetch(fetchUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ImageProxy/1.0)",
      },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const buffer = await response.arrayBuffer();

    // Check size (20MB max)
    if (buffer.byteLength > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "Image too large" }, { status: 413 });
    }

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch image" },
      { status: 502 }
    );
  }
}
