import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "default" | "accent" | "danger";
};

export function Button({ tone = "default", className, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "rounded-control px-3 py-2 text-sm",
        tone === "default" && "bg-surface-2 text-text",
        tone === "accent" && "bg-accent text-accent-contrast",
        tone === "danger" && "bg-danger text-danger-contrast",
        className,
      )}
    />
  );
}
