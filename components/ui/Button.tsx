import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "success" | "danger" | "ghost";
type Size = "sm" | "md";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  href?: string;
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
  href,
  children,
  ...props
}: ButtonProps) {
  const classes = cn("btn-base", variantClass[variant], sizeClass[size], className);
  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
