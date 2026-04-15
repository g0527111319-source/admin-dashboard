/**
 * Curated library of architecture / interior-design backdrop images.
 *
 * Every ID in this file has been visually verified via WebFetch against the
 * Unsplash CDN — if you add new entries, please run the same probe before
 * committing, otherwise a bad ID just renders as a blank section with no
 * clear fail signal.
 *
 * Organized by *palette* so it's easy to pick an image that fits the
 * luminance of the section it sits behind:
 *
 *   HOMES         — beautiful residential exteriors (pools, facades, villas).
 *   ROOMS         — designed interiors (living rooms, bedrooms, galleries).
 *   MATERIAL      — close-ups of marble, wood, stone textures.
 *   ARCHITECTURE  — silhouettes & structure (hallways, staircases).
 *
 * All images are served by the Unsplash CDN at a 1800px variant — enough for
 * 2k displays without blowing the transfer budget. They render at 8–16%
 * opacity inside `DepthSection`, so even the heavier ones stay subtle.
 */

const u = (id: string, w = 1800, q = 70) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=${q}`;

export const DEPTH_IMAGES = {
  // ── HOMES — beautiful residential exteriors ────────────────────────────
  /** white modern villa with pool and palm — signature hero shot */
  brightVilla: u("photo-1600596542815-ffad4c1539a9"),
  /** modern villa with palm + pool — warmer counterpart */
  poolHouse: u("photo-1512917774080-9991f1c4c750"),
  /** classic white beach house with balcony + pool */
  beachHouse: u("photo-1564013799919-ab600027ffc6"),
  /** modern interior with pool view through floor-to-ceiling glass */
  modernFacade: u("photo-1600573472550-8090b5e0745e"),

  // ── ROOMS — designed interiors ─────────────────────────────────────────
  /** cream living room with gallery wall + mustard pillow — designer vibe */
  livingGallery: u("photo-1600210491369-e753d80a41f3"),
  /** bright open-plan living with wide windows, cream sofas */
  brightLiving: u("photo-1560448204-e02f11c3d0e2"),
  /** blue-wall bedroom with wicker pendant — serene residential */
  blueBedroom: u("photo-1618221118493-9cfa1a1c00da"),
  /** green accent bedroom, mid-century details */
  greenBedroom: u("photo-1615529162924-f8605388461d"),
  /** soft grey living with floating staircase */
  softLiving: u("photo-1565182999561-18d7dc61c393"),
  /** luxury bedroom with gold chandelier, skyline view */
  luxBedroom: u("photo-1616594039964-ae9021a400a0"),
  /** luminous natural-light interior — calm, neutral */
  naturalLight: u("photo-1618221195710-dd6b41faaea6"),

  // ── MATERIAL — close-up textures ───────────────────────────────────────
  /** warm wood tones — a designer's studio feeling */
  warmWood: u("photo-1616486338812-3dadae4b4ace"),

  // ── ARCHITECTURE — silhouettes & structure ─────────────────────────────
  /** minimal hallway / concrete corridor */
  minimalHall: u("photo-1600607687939-ce8a6c25118c"),
} as const;

export type DepthImageKey = keyof typeof DEPTH_IMAGES;
