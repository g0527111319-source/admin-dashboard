/**
 * Curated library of architecture / interior-design backdrop images.
 *
 * Organized by *palette* so it's easy to pick an image that fits the
 * luminance of the section it sits behind:
 *
 *   BRIGHT        — airy, light-filled, pale tones. Perfect on light UI.
 *   WARM          — wood, cream, beige. Feels homey, residential.
 *   MATERIAL      — close-ups of marble, stone, terrazzo, linen.
 *   ARCHITECTURE  — stronger silhouettes (hallways, facades, staircases).
 *
 * All images are served by the Unsplash CDN at a 1800px variant — enough for
 * 2k displays without blowing the transfer budget. They render at 8–18%
 * opacity inside `DepthSection`, so even the heavier ones stay subtle.
 *
 * Guidelines when adding a new image:
 *   - prefer architectural texture & minimal scenes over busy rooms
 *   - avoid recognizable faces and copyrighted design objects
 *   - quality 70, width 1800 for consistency
 */

const u = (id: string, w = 1800, q = 70) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=${q}`;

export const DEPTH_IMAGES = {
  // ── BRIGHT — airy, pale, light-filled ──────────────────────────────────
  /** luminous modern interior, soft natural light — default for bright sections */
  naturalLight: u("photo-1618221195710-dd6b41faaea6"),
  /** minimalist bathroom, stone + water, very bright */
  brightBathroom: u("photo-1600210492486-724fe5c67fb0"),
  /** modern kitchen, clean lines, lots of light */
  brightKitchen: u("photo-1600585154340-be6161a56a0c"),
  /** scandi living — pale tones, calm */
  scandiLiving: u("photo-1586023492125-27b2c045efd7"),
  /** open living room, tall windows */
  openLiving: u("photo-1600566753086-00f18fe6ba68"),
  /** modern bedroom, crisp whites */
  brightBedroom: u("photo-1616594039964-ae9021a400a0"),

  // ── WARM — wood, cream, beige, residential ─────────────────────────────
  /** warm wood tones — a designer's studio feeling */
  warmWood: u("photo-1616486338812-3dadae4b4ace"),
  /** cozy reading nook */
  readingNook: u("photo-1618220179428-22790b461013"),
  /** natural textures, hospitable */
  cozyInterior: u("photo-1600566752355-35792bedcfea"),

  // ── MATERIAL — close-up textures ───────────────────────────────────────
  /** luxury marble slab — ideal for CTAs on light sections */
  marble: u("photo-1615875605825-5eb9bb5d52ac"),
  /** kitchen counter with marble */
  marbleCounter: u("photo-1556909114-f6e7ad7d3136"),
  /** golden travertine / stone wall */
  stone: u("photo-1600607687644-c7171b42498f"),
  /** linen / soft fabric texture */
  linen: u("photo-1611892440504-42a792e24d32"),

  // ── ARCHITECTURE — silhouettes & structure ─────────────────────────────
  /** minimal hallway / concrete corridor */
  minimalHall: u("photo-1600607687939-ce8a6c25118c"),
  /** concrete architectural facade */
  concreteFacade: u("photo-1615529182904-14819c35db37"),
  /** modern architectural staircase */
  staircase: u("photo-1600566753190-17f0baa2a6c3"),
  /** designer lobby with sculptural lighting */
  lobby: u("photo-1613490493576-7fde63acd811"),

  // ── BEAUTIFUL HOMES — signature exteriors & stunning interiors ─────────
  /** private house at dusk — cinematic */
  houseDusk: u("photo-1564013799919-ab600027ffc6"),
  /** modern villa — clean exterior */
  modernVilla: u("photo-1600596542815-ffad4c1539a9"),
  /** modern architectural house */
  archHouse: u("photo-1600573472550-8090b5e0745e"),
  /** designer home interior, sculptural */
  designerHome: u("photo-1600210491369-e753d80a41f3"),
} as const;

export type DepthImageKey = keyof typeof DEPTH_IMAGES;
