export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import {
  connectWhatsApp,
  disconnectWhatsApp,
  getConnectionState,
  getQRCode,
} from "@/lib/whatsapp";

// GET — current connection status + QR code
export async function GET() {
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
export async function POST() {
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
export async function DELETE() {
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
