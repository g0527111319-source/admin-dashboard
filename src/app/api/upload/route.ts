export const dynamic = "force-dynamic";
import { txt } from "@/content/siteText";
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
// ==========================================
// העלאת תמונות — Image Upload API
// ==========================================
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml", "application/pdf"];
const MAX_SIZE = 15 * 1024 * 1024; // 15MB
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const folder = (formData.get("folder") as string) || "business-cards";
        if (!file) {
            return NextResponse.json({ error: txt("src/app/api/upload/route.ts::001", "\u05DC\u05D0 \u05E0\u05D1\u05D7\u05E8 \u05E7\u05D5\u05D1\u05E5") }, { status: 400 });
        }
        // Validate type
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json({ error: txt("src/app/api/upload/route.ts::002", "\u05E1\u05D5\u05D2 \u05E7\u05D5\u05D1\u05E5 \u05DC\u05D0 \u05E0\u05EA\u05DE\u05DA. \u05D9\u05E9 \u05DC\u05D4\u05E2\u05DC\u05D5\u05EA \u05EA\u05DE\u05D5\u05E0\u05D4 (JPG, PNG, WebP, GIF, SVG)") }, { status: 400 });
        }
        // Validate size
        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: txt("src/app/api/upload/route.ts::003", "\u05D4\u05E7\u05D5\u05D1\u05E5 \u05D2\u05D3\u05D5\u05DC \u05DE\u05D3\u05D9. \u05DE\u05E7\u05E1\u05D9\u05DE\u05D5\u05DD 5MB") }, { status: 400 });
        }
        // Generate unique filename
        const ext = file.name.split(".").pop() || "jpg";
        const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        // Ensure upload directory exists
        const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
        await mkdir(uploadDir, { recursive: true });
        // Write file
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filePath = path.join(uploadDir, uniqueName);
        await writeFile(filePath, buffer);
        // Return public URL
        const url = `/uploads/${folder}/${uniqueName}`;
        return NextResponse.json({ url, filename: uniqueName });
    }
    catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: txt("src/app/api/upload/route.ts::004", "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D4\u05E2\u05DC\u05D0\u05EA \u05D4\u05E7\u05D5\u05D1\u05E5") }, { status: 500 });
    }
}
