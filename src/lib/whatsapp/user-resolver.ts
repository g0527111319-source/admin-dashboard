// ==========================================
// User Resolver — Phone → Platform User
// ==========================================
// Resolves a WhatsApp phone number to a registered
// designer, supplier, or admin in the platform.

import prisma from "@/lib/prisma";

// ==========================================
// Types
// ==========================================
export interface WhatsAppUser {
  type: "designer" | "supplier" | "admin";
  id: string;
  name: string;
  phone: string;
  data: Record<string, unknown>;
}

// ==========================================
// Phone Number Normalization
// ==========================================

/**
 * Normalize Israeli phone numbers to a consistent format (972XXXXXXXXX)
 * Handles: 05X-XXX-XXXX, +972-5X-XXX-XXXX, 9725XXXXXXXX, etc.
 */
export function normalizePhone(phone: string): string {
  // Remove all non-digit characters
  let clean = phone.replace(/\D/g, "");

  // Remove WhatsApp suffix if present
  clean = clean.replace(/@.*$/, "");

  // 05X... → 9725X...
  if (clean.startsWith("05") && clean.length === 10) {
    clean = "972" + clean.slice(1);
  }
  // 0X... (other Israeli prefixes) → 972X...
  else if (clean.startsWith("0") && clean.length === 10) {
    clean = "972" + clean.slice(1);
  }
  // Already 972...
  else if (clean.startsWith("972") && clean.length === 12) {
    // correct format
  }
  // +972 was stripped to 972 by digit-only filter — OK
  // If it's 5XXXXXXXX (9 digits, missing 972 prefix)
  else if (clean.startsWith("5") && clean.length === 9) {
    clean = "972" + clean;
  }

  return clean;
}

/**
 * Generate phone variants to search in the database.
 * Users might store numbers as 052-XXX-XXXX, +972-52-XXX-XXXX, etc.
 */
function phoneVariants(normalized: string): string[] {
  const variants: string[] = [normalized];

  // If 972XXXXXXXXX → also try 0XXXXXXXXX
  if (normalized.startsWith("972") && normalized.length === 12) {
    variants.push("0" + normalized.slice(3));
    variants.push("+972" + normalized.slice(3));
    variants.push("+972-" + normalized.slice(3, 4) + "-" + normalized.slice(4, 7) + "-" + normalized.slice(7));
    // With dashes: 052-XXX-XXXX
    const local = "0" + normalized.slice(3);
    variants.push(local.slice(0, 3) + "-" + local.slice(3, 6) + "-" + local.slice(6));
    // Without prefix
    variants.push(normalized.slice(3));
  }

  return variants;
}

// ==========================================
// Admin Phone Check
// ==========================================
const ADMIN_PHONES = (process.env.ADMIN_WHATSAPP_PHONES || "").split(",").map((p) => p.trim()).filter(Boolean);

function isAdmin(normalizedPhone: string): boolean {
  return ADMIN_PHONES.some((adminPhone) => {
    const normalizedAdmin = normalizePhone(adminPhone);
    return normalizedAdmin === normalizedPhone;
  });
}

// ==========================================
// Main Resolver
// ==========================================

/**
 * Resolve a phone number to a platform user.
 * Checks: admin list → Designer table → Supplier table
 * Returns null if not found (unregistered number).
 */
export async function resolveUser(phoneNumber: string): Promise<WhatsAppUser | null> {
  const normalized = normalizePhone(phoneNumber);
  const variants = phoneVariants(normalized);

  // 1. Check admin
  if (isAdmin(normalized)) {
    return {
      type: "admin",
      id: "admin",
      name: "מנהלת הקהילה",
      phone: normalized,
      data: {},
    };
  }

  // 2. Check Designer table
  try {
    const designer = await prisma.designer.findFirst({
      where: {
        phone: { in: variants },
        isActive: true,
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        city: true,
        specialization: true,
        totalDealsReported: true,
        totalDealAmount: true,
        eventsAttended: true,
      },
    });

    if (designer) {
      return {
        type: "designer",
        id: designer.id,
        name: designer.fullName,
        phone: normalized,
        data: {
          email: designer.email,
          city: designer.city,
          specialization: designer.specialization,
          totalDealsReported: designer.totalDealsReported,
          totalDealAmount: designer.totalDealAmount,
          eventsAttended: designer.eventsAttended,
        },
      };
    }
  } catch (error) {
    console.error("[UserResolver] Error querying Designer:", error);
  }

  // 3. Check Supplier table
  try {
    const supplier = await prisma.supplier.findFirst({
      where: {
        phone: { in: variants },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        contactName: true,
        phone: true,
        email: true,
        category: true,
        totalDeals: true,
        totalDealAmount: true,
        averageRating: true,
      },
    });

    if (supplier) {
      return {
        type: "supplier",
        id: supplier.id,
        name: supplier.contactName || supplier.name,
        phone: normalized,
        data: {
          businessName: supplier.name,
          email: supplier.email,
          category: supplier.category,
          totalDeals: supplier.totalDeals,
          totalDealAmount: supplier.totalDealAmount,
          averageRating: supplier.averageRating,
        },
      };
    }
  } catch (error) {
    console.error("[UserResolver] Error querying Supplier:", error);
  }

  // 4. Not found
  return null;
}

/**
 * Unknown user response message
 */
export const UNKNOWN_USER_MESSAGE = "מספר זה אינו רשום במערכת. פנה למנהלת הקהילה.";
