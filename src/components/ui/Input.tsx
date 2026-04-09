"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const inputVariants = cva(
  [
    "flex w-full rounded-btn border bg-white text-text-primary",
    "placeholder:text-text-faint",
    "transition-all ease-out-expo duration-200",
    "focus:outline-none focus:border-gold focus:shadow-[0_0_0_3px_rgba(201,168,76,0.15)]",
    "hover:border-border-hover",
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-bg-surface",
    "file:border-0 file:bg-transparent file:text-sm file:font-medium",
  ],
  {
    variants: {
      variant: {
        default: "border-border-subtle",
        error: "border-red-500 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]",
        ghost: "border-transparent bg-bg-surface hover:bg-bg-surface-2",
      },
      size: {
        sm: "h-9 px-3 text-xs",
        md: "h-10 px-4 text-sm",
        lg: "h-11 px-5 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", variant, size, iconLeft, iconRight, error, ...props }, ref) => {
    const effectiveVariant = error ? "error" : variant;
    if (iconLeft || iconRight) {
      return (
        <div className="relative w-full">
          {iconLeft && (
            <div className="absolute start-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
              {iconLeft}
            </div>
          )}
          <input
            type={type}
            className={cn(
              inputVariants({ variant: effectiveVariant, size }),
              iconLeft && "ps-10",
              iconRight && "pe-10",
              className
            )}
            ref={ref}
            {...props}
          />
          {iconRight && (
            <div className="absolute end-3 top-1/2 -translate-y-1/2 text-text-muted">{iconRight}</div>
          )}
        </div>
      );
    }
    return (
      <input
        type={type}
        className={cn(inputVariants({ variant: effectiveVariant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string }
>(({ className, error, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[80px] w-full rounded-btn border bg-white px-4 py-2.5 text-sm text-text-primary",
      "placeholder:text-text-faint resize-y",
      "transition-all ease-out-expo duration-200",
      "focus:outline-none focus:border-gold focus:shadow-[0_0_0_3px_rgba(201,168,76,0.15)]",
      "hover:border-border-hover",
      "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-bg-surface",
      error ? "border-red-500" : "border-border-subtle",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Input, Textarea, inputVariants };
export default Input;
