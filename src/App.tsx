import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { UnitsProvider } from "@/contexts/UnitsContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Directory from "./pages/Directory";
import Marketplace from "./pages/Marketplace";
import Inspections from "./pages/Inspections";
import PostInspection from "./pages/PostInspection";
import ProfileEdit from "./pages/settings/ProfileEdit";
import Admin from "./pages/Admin";
import AddProperty from "./pages/AddProperty";
import ClientBriefs from "./pages/ClientBriefs";
import ClientBriefForm from "./pages/ClientBriefForm";
import ClientBriefDetail from "./pages/ClientBriefDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <UnitsProvider>
        <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/directory" element={<Directory />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/inspections" element={<Inspections />} />

            {/* Protected Routes */}
            <Route
              path="/inspections/new"
              element={
                <ProtectedRoute requiredPermission="CAN_POST_INSPECTIONS">
                  <PostInspection />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="admin" showForbidden>
                  <Admin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/marketplace/add"
              element={
                <ProtectedRoute requiredPermission="CAN_SUBMIT_PROPERTY" showForbidden>
                  <AddProperty />
                </ProtectedRoute>
              }
            />
            <Route
              path="/briefs"
              element={
                <ProtectedRoute requiredRole="verified_professional" showForbidden>
                  <ClientBriefs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/briefs/new"
              element={
                <ProtectedRoute requiredRole="verified_professional" showForbidden>
                  <ClientBriefForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/briefs/:id"
              element={
                <ProtectedRoute requiredRole="verified_professional" showForbidden>
                  <ClientBriefDetail />
                </ProtectedRoute>
              }
            />

            <Route path="/settings/profile" element={<ProfileEdit />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </TooltipProvider>
      </UnitsProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
