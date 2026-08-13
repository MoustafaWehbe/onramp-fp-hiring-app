import { Outlet } from "react-router-dom";
import { Header } from "../components/layout/Header";
import { Footer } from "../components/layout/Footer";
import { RouteTransition } from "../components/shared/RouteTransition";

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <RouteTransition>
          <Outlet />
        </RouteTransition>
      </main>
      <Footer />
    </div>
  );
}
