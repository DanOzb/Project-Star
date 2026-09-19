import type { ReactNode } from "react";
import { useState } from "react";
import { Button } from "@/components/Button";
import { Card, CardTitle } from "@/components/Card";
import { cn } from "@/lib/utils";

// A component defined in the route file rather than imported. The locator has
// to address this as Settings.tsx#Field, so it is here on purpose.
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className={cn("flex flex-col gap-1")}>
      <span className={cn("text-xs text-text-muted")}>{label}</span>
      {children}
    </label>
  );
}

export default function Settings() {
  const [name, setName] = useState("Untitled project");
  const [compact, setCompact] = useState(false);

  return (
    <Card className={cn("", compact && "p-4")}>
      <CardTitle>Settings</CardTitle>

      <div className={cn("mt-4 flex flex-col gap-4")}>
        <Field label="Project name">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={cn(
              "rounded-control border border-border bg-bg px-3 py-2 text-sm text-text",
            )}
          />
        </Field>

        <Field label="Density">
          <Button
            tone={compact ? "accent" : "default"}
            onClick={() => setCompact((value) => !value)}
            className={cn("self-start")}
          >
            {compact ? "Compact" : "Comfortable"}
          </Button>
        </Field>
      </div>
    </Card>
  );
}
