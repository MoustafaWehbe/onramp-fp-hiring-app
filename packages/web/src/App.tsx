import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./providers/AuthProvider";
import { RealtimeProvider } from "./providers/RealtimeProvider";
import { AppRoutes } from "./routes";

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        {/* Inside AuthProvider: the stream opens on login and closes on
            logout, following the signed-in user. */}
        <RealtimeProvider>
          <AppRoutes />
          {/* Sonner already animates toasts in/out; this only aligns the
              surface (rounded-2xl, elevated shadow) with the rest of the
              app's card language. richColors still owns the per-type
              (success/error/warning/info) background and text colors. */}
          <Toaster
            richColors
            closeButton
            position="top-right"
            toastOptions={{
              classNames: {
                toast:
                  "rounded-2xl shadow-[0_10px_30px_-8px_rgba(79,70,229,0.25)] dark:shadow-[0_10px_30px_-8px_rgba(129,140,248,0.3)]",
              },
            }}
          />
        </RealtimeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
