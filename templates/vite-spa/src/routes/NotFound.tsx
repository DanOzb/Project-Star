import { Link } from "react-router";
import { Card, CardTitle } from "@/components/Card";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <Card>
      <CardTitle>Not found</CardTitle>
      <p className={cn("mt-2 text-sm text-text-muted")}>
        That route does not exist.
      </p>
      <Link
        to="/"
        className={cn("mt-4 inline-block text-sm text-accent underline")}
      >
        Back home
      </Link>
    </Card>
  );
}
