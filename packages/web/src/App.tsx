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
          <Toaster richColors closeButton position="top-right" />
        </RealtimeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
