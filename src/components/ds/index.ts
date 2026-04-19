// Zirat Adrichalut — Design System components (v4 cosmetic layer).
// Pure presentational wrappers around the `.ds-*` CSS utilities defined
// in `src/app/design-system.css`. They DO NOT change routing, data, or
// business logic; they only render the signature visual identity.
//
// Namespace: `ds/` (separate from `ui/` primitives so nothing collides).

export { TwistButton, type TwistButtonProps } from "./TwistButton";
export { AuroraBackground, type AuroraBackgroundProps } from "./AuroraBackground";
export { DsCard, type DsCardProps } from "./DsCard";
export { Chip, type ChipProps } from "./Chip";
export { DsBadge, type DsBadgeProps, type DsBadgeVariant } from "./DsBadge";
export { PillTabs, type PillTabsProps, type PillTab } from "./PillTabs";
export { StatCard, type StatCardProps } from "./StatCard";
export { Eyebrow, GoldText, RevealLine } from "./Primitives";
export type {
  EyebrowProps,
  GoldTextProps,
  RevealLineProps,
} from "./Primitives";
