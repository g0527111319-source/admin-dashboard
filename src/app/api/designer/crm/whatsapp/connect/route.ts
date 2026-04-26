export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import {
  connectWhatsApp,
  disconnectWhatsApp,
  getConnectionState,
  getQRCode,
} from "@/lib/whatsapp";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

// GET — current connection status + QR code
export async function GET(req: NextRequest) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const state = getConnectionState();
    const qr = getQRCode();

    return NextResponse.json({
      state,
      qr,
    });
  } catch (error) {
    console.error("WhatsApp status error:", error);
    return NextResponse.json(
      { state: "disconnected", qr: null, error: "Failed to get status" },
      { status: 500 }
    );
  }
}

// POST — initiate connection (generates QR code)
export async function POST(req: NextRequest) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const currentState = getConnectionState();

    if (currentState === "connected") {
      return NextResponse.json({
        state: "connected",
        message: "Already connected",
      });
    }

    // Start connection process — this triggers QR code generation
    connectWhatsApp().catch((err) => {
      console.error("WhatsApp connection error:", err);
    });

    // Wait a bit for QR code to be generated
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const state = getConnectionState();
    const qr = getQRCode();

    return NextResponse.json({
      state,
      qr,
      message: state === "qr_ready" ? "QR code ready — scan with WhatsApp" : "Connecting...",
    });
  } catch (error) {
    console.error("WhatsApp connect error:", error);
    return NextResponse.json(
      { error: "Failed to connect" },
      { status: 500 }
    );
  }
}

// DELETE — disconnect
export async function DELETE(req: NextRequest) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    await disconnectWhatsApp();
    return NextResponse.json({
      state: "disconnected",
      message: "Disconnected successfully",
    });
  } catch (error) {
    console.error("WhatsApp disconnect error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect" },
      { status: 500 }
    );
  }
}
