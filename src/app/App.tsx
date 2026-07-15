import { RouterProvider } from "react-router";
import { router } from "./routes";
import { InventoryProvider } from "./store/InventoryContext";
import { AuthProvider } from "./store/AuthContext";
import { Toaster } from "./components/ui/sonner";

export default function App() {
  return (
    <AuthProvider>
      <InventoryProvider>
        <RouterProvider router={router} />
        <Toaster richColors position="top-right" />
      </InventoryProvider>
    </AuthProvider>
  );
}
