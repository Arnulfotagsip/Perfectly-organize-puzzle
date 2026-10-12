import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

type Variant = "primary" | "soft" | "ghost";
type Size = "md" | "lg" | "icon";

export function buttonClass(variant: Variant = "soft", size: Size = "md", extra = "") {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-2xl font-bold select-none transition-[transform,background-color,box-shadow,opacity] duration-150 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none";
  const sizes: Record<Size, string> = {
    md: "min-h-12 px-5 text-base",
    lg: "min-h-14 px-7 text-lg",
    icon: "size-12 shrink-0",
  };
  const variants: Record<Variant, string> = {
    primary: "bg-primary text-primary-ink shadow-soft hover:brightness-105",
    soft: "bg-surface text-ink border border-line shadow-soft hover:bg-surface-2",
    ghost: "text-ink hover:bg-surface-2",
  };
  return `${base} ${sizes[size]} ${variants[variant]} ${extra}`;
}

interface Common {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  children?: ReactNode;
}

export function Button({ variant, size, icon, children, className = "", type = "button", ...rest }: Common & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} {...rest}>
      {icon && <Icon name={icon} />}
      {children}
    </button>
  );
}

export function ButtonLink({ variant, size, icon, children, className = "", ...rest }: Common & ComponentProps<typeof Link>) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {icon && <Icon name={icon} />}
      {children}
    </Link>
  );
}
