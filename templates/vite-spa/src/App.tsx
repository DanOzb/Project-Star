import { BrowserRouter, Route, Routes } from "react-router";
import { AppShell } from "@/components/AppShell";
import { routes } from "@/routes";

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          {routes.map(({ path, Component }) => (
            <Route key={path} path={path} element={<Component />} />
          ))}
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}