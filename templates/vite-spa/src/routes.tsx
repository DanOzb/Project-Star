import type { ComponentType } from "react";
import Home from "@/routes/Home";
import Inbox from "@/routes/Inbox";
import Settings from "@/routes/Settings";
import NotFound from "@/routes/NotFound";

export type AppRoute = {
  path: string;
  label: string;
  showInNav: boolean;
  Component: ComponentType;
};

export const routes: AppRoute[] = [
  { path: "/", label: "Home", showInNav: true, Component: Home },
  { path: "/inbox", label: "Inbox", showInNav: true, Component: Inbox },
  { path: "/settings", label: "Settings", showInNav: true, Component: Settings },
  { path: "*", label: "Not found", showInNav: false, Component: NotFound },
];
