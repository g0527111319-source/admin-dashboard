export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

// ==========================================
// SSRF Protection — Allowed domains & IP blocking
// ==========================================

const ALLOWED_HOSTNAME_PATTERNS = [
  "drive.google.com",
  "lh3.googleusercontent.com",
  "i.imgur.com",
  "imgbb.com",
];

/** Match *.cdninstagram.com and exact matches */
function isAllowedHostname(hostname: string): boolean {
  if (ALLOWED_HOSTNAME_PATTERNS.includes(hostname)) return true;
  if (hostname.endsWith(".cdninstagram.com")) return true;
  if (hostname.endsWith(".imgbb.com")) return true;
  if (hostname.endsWith(".googleusercontent.com")) return true;
  return false;
}

/** Block private/reserved IP ranges */
function isPrivateIp(hostname: string): boolean {
  // Block obvious private IPs and localhost
  if (hostname === "localhost" || hostname === "0.0.0.0" || hostname === "::1") return true;
  if (hostname === "127.0.0.1") return true;

  // Check IPv4 private ranges
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number);
    if (a === 10) return true;                          // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true;   // 172.16.0.0/12
    if (a === 192 && b === 168) return true;             // 192.168.0.0/16
    if (a === 127) return true;                          // 127.0.0.0/8
    if (a === 0) return true;                            // 0.0.0.0/8
    if (a === 169 && b === 254) return true;             // link-local
  }

  // Block IPv6 loopback and private
  if (hostname.startsWith("[")) {
    const inner = hostname.slice(1, -1);
    if (inner === "::1" || inner === "::") return true;
    if (inner.startsWith("fc") || inner.startsWith("fd")) return true;
    if (inner.startsWith("fe80")) return true;
  }

  return false;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  try {
    // Validate URL format and protocol
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Block non-HTTP(S) protocols
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return NextResponse.json({ error: "Only HTTP(S) URLs are allowed" }, { status: 400 });
    }

    // Block private IPs
    if (isPrivateIp(parsedUrl.hostname)) {
      return NextResponse.json({ error: "URL not allowed" }, { status: 403 });
    }

    // Validate hostname against allowlist
    if (!isAllowedHostname(parsedUrl.hostname)) {
      return NextResponse.json({ error: "Domain not allowed" }, { status: 403 });
    }

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
      signal: AbortSignal.timeout(5_000),
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
