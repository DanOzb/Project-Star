import type { ReactNode } from "react";
import { Link, useMatch } from "react-router";
import { cn } from "@/lib/utils";
import { routes } from "@/routes";

function NavItem({ path, label }: { path: string; label: string }) {
  const isActive = useMatch(path) !== null;

  return (
    <Link
      to={path}
      className={cn(
        "rounded-control px-3 py-2 text-sm text-text-muted",
        isActive && "bg-surface-2 text-text",
      )}
    >
      {label}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className={cn("min-h-screen bg-bg")}>
      <header className={cn("border-b border-border bg-surface")}>
        <nav
          className={cn("mx-auto flex max-w-3xl items-center gap-1 px-6 py-3")}
        >
          {routes
            .filter((route) => route.showInNav)
            .map((route) => (
              <NavItem key={route.path} path={route.path} label={route.label} />
            ))}
        </nav>
      </header>

      <main className={cn("mx-auto max-w-3xl px-6 py-8")}>{children}</main>
    </div>
  );
}
