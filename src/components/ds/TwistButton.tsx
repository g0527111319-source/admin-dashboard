"use client";

import * as React from "react";
import Link from "next/link";

/**
 * TwistButton — the signature organic-shape CTA of the Zirat design system.
 *
 * Renders a button (or Link when `href` is provided) with a morphing blob
 * background and a rotating dashed halo. Pure CSS; styling lives in
 * `src/app/design-system.css` under the `.ds-twist*` classes.
 *
 * NOTE: This is a cosmetic wrapper. It changes NO business logic — pass
 * through onClick, href, type, etc. as you would any button/anchor.
 */

type TwistVariant = "primary" | "secondary" | "dark";
type TwistSize = "sm" | "md" | "lg";

type CommonProps = {
  variant?: TwistVariant;
  size?: TwistSize;
  className?: string;
  children: React.ReactNode;
};

type ButtonOnly = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
    href?: undefined;
  };

type LinkOnly = CommonProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children" | "href"> & {
    href: string;
    external?: boolean;
  };

export type TwistButtonProps = ButtonOnly | LinkOnly;

function classes(variant: TwistVariant, size: TwistSize, extra?: string) {
  const sizeClass =
    size === "sm" ? "ds-twist-sm" : size === "lg" ? "ds-twist-lg" : "";
  const variantClass =
    variant === "primary"
      ? "ds-twist-primary"
      : variant === "dark"
      ? "ds-twist-dark"
      : "ds-twist-secondary";
  return ["ds-twist", variantClass, sizeClass, extra].filter(Boolean).join(" ");
}

export function TwistButton(props: TwistButtonProps) {
  const {
    variant = "primary",
    size = "md",
    className,
    children,
  } = props;

  const inner = (
    <>
      <span className="ds-twist-halo" aria-hidden />
      <span className="ds-twist-blob" aria-hidden />
      <span className="ds-twist-label">{children}</span>
    </>
  );

  if ("href" in props && props.href) {
    const { href, external, variant: _v, size: _s, className: _c, children: _ch, ...rest } =
      props;
    const cls = classes(variant, size, className);
    if (external) {
      return (
        <a
          href={href}
          className={cls}
          target="_blank"
          rel="noopener noreferrer"
          {...rest}
        >
          {inner}
        </a>
      );
    }
    return (
      <Link href={href} className={cls} {...rest}>
        {inner}
      </Link>
    );
  }

  const { variant: _v, size: _s, className: _c, children: _ch, ...rest } =
    props as ButtonOnly;
  return (
    <button className={classes(variant, size, className)} {...rest}>
      {inner}
    </button>
  );
}

export default TwistButton;
