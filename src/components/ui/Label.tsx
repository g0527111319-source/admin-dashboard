import * as React from "react";
import { cn } from "@/lib/cn";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  optional?: boolean;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, optional, children, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "block text-sm font-medium text-text-secondary mb-1.5 cursor-pointer",
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="text-red-500 ms-1">*</span>}
      {optional && <span className="text-text-faint text-xs font-normal ms-2">(אופציונלי)</span>}
    </label>
  )
);
Label.displayName = "Label";

export { Label };
export default Label;
