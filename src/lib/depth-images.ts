/**
 * Curated library of architecture/interior backdrop images for DepthSection.
 *
 * Keys are semantic (use them like `DEPTH_IMAGES.marble`) so pages never hard-code
 * Unsplash IDs. All images are served by the Unsplash CDN with a 1800px variant —
 * enough for 2k displays without exploding the transfer budget. Lazy-loaded in
 * the DepthSection component and rendered at 5–15% opacity so loading cost is
 * almost imperceptible.
 *
 * Guidelines when adding a new image:
 *   - prefer architectural texture & minimal scenes over busy rooms
 *   - avoid faces, recognizable people, or copyrighted design objects
 *   - quality ≥ 70, width = 1800 for consistency
 */

const u = (id: string, w = 1800, q = 70) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=${q}`;

export const DEPTH_IMAGES = {
  // ── Architectural minimalism ────────────────────────────────────────────
  /** minimal hallway / concrete corridor — works for hero sections */
  minimalHall: u("photo-1600607687939-ce8a6c25118c"),
  /** luminous modern interior, soft natural light */
  naturalLight: u("photo-1618221195710-dd6b41faaea6"),
  /** concrete architectural facade */
  concreteFacade: u("photo-1615529182904-14819c35db37"),
  /** modern architectural staircase */
  staircase: u("photo-1600566753190-17f0baa2a6c3"),

  // ── Warm / residential ──────────────────────────────────────────────────
  /** warm wood tones — great for residential sections */
  warmWood: u("photo-1616486338812-3dadae4b4ace"),
  /** modern living room with sofa */
  livingRoom: u("photo-1586023492125-27b2c045efd7"),
  /** cozy reading nook */
  readingNook: u("photo-1618220179428-22790b461013"),

  // ── Materials / textures ────────────────────────────────────────────────
  /** luxury marble slab — ideal for CTAs on dark sections */
  marble: u("photo-1615875605825-5eb9bb5d52ac"),
  /** golden travertine / stone wall */
  stone: u("photo-1600607687644-c7171b42498f"),

  // ── Signature spaces ────────────────────────────────────────────────────
  /** modern kitchen, clean lines */
  kitchen: u("photo-1600585154340-be6161a56a0c"),
  /** minimalist bathroom, stone + water */
  bathroom: u("photo-1600210492486-724fe5c67fb0"),
  /** designer lobby with sculptural lighting */
  lobby: u("photo-1613490493576-7fde63acd811"),
  /** private house at dusk */
  houseDusk: u("photo-1564013799919-ab600027ffc6"),
} as const;

export type DepthImageKey = keyof typeof DEPTH_IMAGES;
