import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { UnitsProvider } from "@/contexts/UnitsContext";
import { MessageNotificationProvider } from "@/contexts/MessageNotificationContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Directory from "./pages/Directory";
import Marketplace from "./pages/Marketplace";
import Inspections from "./pages/Inspections";
import PostInspection from "./pages/PostInspection";
import ProfileEdit from "./pages/settings/ProfileEdit";
import Billing from "./pages/settings/Billing";
import ConnectReturn from "./pages/settings/ConnectReturn";
import Admin from "./pages/Admin";
import AddProperty from "./pages/AddProperty";
import ClientBriefs from "./pages/ClientBriefs";
import ClientBriefForm from "./pages/ClientBriefForm";
import ClientBriefDetail from "./pages/ClientBriefDetail";
import CreateInspectionJob from "./pages/CreateInspectionJob";
import InspectionSpotlights from "./pages/InspectionSpotlights";
import InspectionSpotlightDetail from "./pages/InspectionSpotlightDetail";
import InspectionReportBuilder from "./pages/InspectionReportBuilder";
import InspectionReportView from "./pages/InspectionReportView";
import MyPostedJobs from "./pages/inspections/MyPostedJobs";
import MyInspectionWork from "./pages/inspections/MyInspectionWork";
import Welcome from "./pages/Welcome";
import ResetPassword from "./pages/ResetPassword";
import Activity from "./pages/Activity";
import Pricing from "./pages/Pricing";
import Messaging from "./pages/Messaging";
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
          <MessageNotificationProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />
            <Route path="/directory" element={<Directory />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/inspections" element={<Inspections />} />
            <Route path="/inspections/spotlights" element={<InspectionSpotlights />} />
            <Route path="/inspections/spotlights/:id" element={<InspectionSpotlightDetail />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/pricing" element={<Pricing />} />

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
                <ProtectedRoute requiredPermission="CAN_MANAGE_CLIENT_BRIEFS" showForbidden>
                  <ClientBriefs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/briefs/new"
              element={
                <ProtectedRoute requiredPermission="CAN_MANAGE_CLIENT_BRIEFS" showForbidden>
                  <ClientBriefForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/briefs/:id"
              element={
                <ProtectedRoute requiredPermission="CAN_MANAGE_CLIENT_BRIEFS" showForbidden>
                  <ClientBriefDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/briefs/:id/edit"
              element={
                <ProtectedRoute requiredPermission="CAN_MANAGE_CLIENT_BRIEFS" showForbidden>
                  <ClientBriefForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inspections/jobs/new"
              element={
                <ProtectedRoute requiredPermission="CAN_POST_INSPECTIONS" showForbidden>
                  <CreateInspectionJob />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inspections/my-jobs"
              element={
                <ProtectedRoute showForbidden>
                  <MyPostedJobs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inspections/my-work"
              element={
                <ProtectedRoute showForbidden>
                  <MyInspectionWork />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inspections/jobs/:jobId/report"
              element={
                <ProtectedRoute showForbidden>
                  <InspectionReportBuilder />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inspections/jobs/:jobId/report/view"
              element={
                <ProtectedRoute showForbidden>
                  <InspectionReportView />
                </ProtectedRoute>
              }
            />

            <Route path="/welcome" element={<Welcome />} />
            <Route
              path="/messages"
              element={
                <ProtectedRoute showForbidden>
                  <Messaging />
                </ProtectedRoute>
              }
            />
            <Route path="/settings/profile" element={<ProfileEdit />} />
            <Route path="/settings/billing" element={<Billing />} />
            <Route path="/settings/connect-return" element={<ConnectReturn />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </MessageNotificationProvider>
        </BrowserRouter>
        </TooltipProvider>
      </UnitsProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
