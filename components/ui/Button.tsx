import * as React from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "success" | "danger" | "ghost";
type Size = "sm" | "md";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClass: Record<Variant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  success: "btn-success",
  danger: "btn-danger",
  ghost: "bg-transparent border-transparent text-text-secondary hover:bg-bg-secondary",
};

const sizeClass: Record<Size, string> = {
  sm: "px-2 py-1 text-[11px]",
  md: "",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn("btn-base", variantClass[variant], sizeClass[size], className)}
      {...props}
    />
  );
}
