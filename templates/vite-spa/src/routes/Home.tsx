import { Button } from "@/components/Button";
import { Card, CardTitle } from "@/components/Card";
import { cn } from "@/lib/utils";

const features = [
  { id: "locator", title: "Locator", body: "Stamps every element at build." },
  { id: "bridge", title: "Bridge", body: "Maps a click back to its source." },
  { id: "engine", title: "Edit engine", body: "Rewrites the leading literal." },
];

export default function Home() {
  return (
    <div className={cn("flex flex-col gap-6")}>
      <Card>
        <CardTitle>Welcome</CardTitle>
        <p className={cn("mt-2 text-sm text-text-muted")}>
          Every element on this page follows the rules in RULES.md.
        </p>
        <div className={cn("mt-4 flex gap-2")}>
          <Button tone="accent">Primary</Button>
          <Button>Secondary</Button>
        </div>
      </Card>

      <div className={cn("grid gap-4 sm:grid-cols-3")}>
        {features.map((feature) => (
          <Card key={feature.id} className={cn("p-4")}>
            <CardTitle className={cn("text-sm")}>{feature.title}</CardTitle>
            <p className={cn("mt-1 text-xs text-text-muted")}>{feature.body}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
