"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, X } from "lucide-react";

/**
 * Send a browser notification (if permission granted).
 * Can be imported and used throughout the app.
 */
export function sendNotification(
  title: string,
  body: string,
  icon: string = "/logo-sticker.webp"
) {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    new Notification(title, { body, icon });
  } catch {
    // Safari / iOS may not support the Notification constructor
  }
}

export default function PushNotificationManager() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;

    const dismissed = localStorage.getItem("push-notification-dismissed");
    if (dismissed) return;

    if (Notification.permission === "default") {
      // Show the banner after a short delay so it doesn't flash on load
      const timer = setTimeout(() => setShowBanner(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleApprove = useCallback(async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        sendNotification("זירת האדריכלות", "ההתראות הופעלו בהצלחה! 🎉");
      }
    } catch {
      // ignore
    }
    setShowBanner(false);
    localStorage.setItem("push-notification-dismissed", "true");
  }, []);

  const handleDismiss = useCallback(() => {
    setShowBanner(false);
    localStorage.setItem("push-notification-dismissed", "true");
  }, []);

  if (!showBanner) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-[90vw] max-w-md animate-in">
      <div className="bg-[#1a1a2e] border border-[#c9a84c]/40 rounded-2xl shadow-2xl px-5 py-4 flex items-center gap-4"
           style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(201,168,76,0.15)" }}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c9a84c]/20 to-[#c9a84c]/5 flex items-center justify-center flex-shrink-0 border border-[#c9a84c]/30">
          <Bell className="w-5 h-5 text-[#c9a84c]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">רוצה לקבל התראות על עדכונים?</p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleApprove}
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-[#c9a84c] text-[#1a1a2e] hover:bg-[#d4b85c] transition-colors"
            >
              אישור
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-1.5 text-xs font-medium rounded-lg text-[#c9a84c]/70 hover:text-[#c9a84c] hover:bg-[#c9a84c]/10 transition-colors"
            >
              לא עכשיו
            </button>
          </div>
        </div>
        <button onClick={handleDismiss} className="p-1 rounded-lg hover:bg-white/5 transition-colors flex-shrink-0">
          <X className="w-4 h-4 text-white/40" />
        </button>
      </div>
    </div>
  );
}
