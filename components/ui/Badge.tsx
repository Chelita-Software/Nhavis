import * as React from "react";
import { cn } from "@/lib/cn";

export type BadgeVariant =
  | "admin"
  | "gerente"
  | "supervisor"
  | "mecanico"
  | "scheduled"
  | "open"
  | "progress"
  | "waiting"
  | "pending"
  | "closed"
  | "authorized"
  | "rejected"
  | "tercero"
  | "neutral";

const variantClass: Record<BadgeVariant, string> = {
  admin: "b-admin",
  gerente: "b-gerente",
  supervisor: "b-supervisor",
  mecanico: "b-mecanico",
  scheduled: "b-scheduled",
  open: "b-open",
  progress: "b-progress",
  waiting: "b-waiting",
  pending: "b-pending",
  closed: "b-closed",
  authorized: "b-authorized",
  rejected: "b-rejected",
  tercero: "b-tercero",
  neutral: "bg-bg-tertiary text-text-secondary",
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ variant = "neutral", className, ...props }: BadgeProps) {
  return <span className={cn("badge", variantClass[variant], className)} {...props} />;
}
