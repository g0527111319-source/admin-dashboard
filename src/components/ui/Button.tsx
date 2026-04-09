"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-btn font-semibold",
    "transition-all ease-out-expo duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "active:scale-[0.98]",
    "relative overflow-hidden",
  ],
  {
    variants: {
      variant: {
        gold: [
          "bg-gradient-to-br from-gold via-gold-light to-gold text-white",
          "border border-gold/30 shadow-gold",
          "hover:shadow-gold-hover hover:-translate-y-[1px]",
          "bg-[length:200%_200%] hover:bg-right",
        ],
        outline: [
          "border border-gold/40 bg-transparent text-gold",
          "hover:bg-gold/5 hover:border-gold/70 hover:-translate-y-[1px]",
        ],
        dark: [
          "bg-gray-900 text-white border border-gray-800",
          "hover:bg-gray-800 hover:shadow-md",
        ],
        danger: [
          "bg-red-500 text-white border border-red-600/50",
          "hover:bg-red-600 hover:shadow-md",
        ],
        ghost: [
          "text-text-muted bg-transparent border border-transparent",
          "hover:bg-bg-surface hover:text-text-primary",
        ],
        secondary: [
          "bg-bg-surface text-text-secondary border border-transparent",
          "hover:bg-bg-surface-2 hover:border-border-subtle/60",
        ],
        link: [
          "text-gold underline-offset-4 hover:underline px-0 h-auto",
        ],
      },
      size: {
        xs: "h-7 px-3 text-xs",
        sm: "h-8 px-4 text-sm",
        md: "h-10 px-5 text-sm",
        lg: "h-11 px-6 text-base",
        xl: "h-12 px-8 text-base",
        icon: "h-10 w-10",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "gold",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      loading = false,
      iconLeft,
      iconRight,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, fullWidth }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4 -ms-1"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
        )}
        {!loading && iconLeft}
        <span>{children}</span>
        {!loading && iconRight}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
export default Button;
