import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import Login from "./pages/Login";
import AdminLayout from "./components/AdminLayout";
import Dashboard from "./pages/Dashboard";
import LeadsPage from "./pages/LeadsPage";
import PropertiesPage from "./pages/PropertiesPage";
import AutoApprovalConfigPage from "./pages/AutoApprovalConfigPage";
import PropertyDetailPage from "./pages/PropertyDetailPage";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import ProfilePage from "./pages/ProfilePage";
import PropertyPurposesPage from "./pages/PropertyPurposesPage";
import PropertyTypesPage from "./pages/PropertyTypesPage";
import PropertyCategoriesPage from "./pages/PropertyCategoriesPage";
import CitiesPage from "./pages/CitiesPage";
import StatesPage from "./pages/StatesPage";
import EnquiriesPage from "./pages/EnquiriesPage";
import SystemUsersPage from "./pages/SystemUsersPage";
import OwnersPage from "./pages/OwnersPage";
import AgentsBrokersPage from "./pages/AgentsBrokersPage";
import BuildersDevelopersPage from "./pages/BuildersDevelopersPage";
import NotFound from "./pages/NotFound";
import { ProfileProvider } from "./context/ProfileContext";

const queryClient = new QueryClient();

const Soon = ({ title }: { title: string }) => (
  <div className="flex items-center justify-center h-64 text-muted-foreground text-lg font-medium">
    {title} — coming soon
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-right" />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route element={<ProfileProvider><AdminLayout /></ProfileProvider>}>

            {/* Main */}
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Properties */}
            <Route path="/auto-approval-config" element={<AutoApprovalConfigPage />} />
            <Route path="/properties"          element={<PropertiesPage />} />
            <Route path="/properties/sale"     element={<PropertiesPage filterType="Sell" />} />
            <Route path="/properties/rent"     element={<PropertiesPage filterType="Rent" />} />
            <Route path="/properties/pg"       element={<PropertiesPage filterType="PG / Co-living" />} />
            <Route path="/properties/:id"      element={<PropertyDetailPage />} />
            <Route path="/projects"            element={<ProjectsPage />} />
            <Route path="/projects/:id"        element={<ProjectDetailPage />} />
            <Route path="/units"               element={<Soon title="Units & Floors" />} />
            <Route path="/states"             element={<StatesPage />} />
            <Route path="/cities"             element={<CitiesPage />} />
            <Route path="/property-purposes"   element={<PropertyPurposesPage />} />
            <Route path="/property-categories" element={<PropertyCategoriesPage />} />
            <Route path="/property-types"      element={<PropertyTypesPage />} />

            {/* Leads & Enquiries */}
            <Route path="/leads"      element={<LeadsPage />} />
            <Route path="/enquiries" element={<EnquiriesPage />} />

            {/* System Users */}
            <Route path="/system-users" element={<SystemUsersPage />} />

            {/* People Management */}
            <Route path="/owners"              element={<OwnersPage />} />
            <Route path="/agents-brokers"      element={<AgentsBrokersPage />} />
            <Route path="/builders-developers" element={<BuildersDevelopersPage />} />

            {/* People */}
            <Route path="/contacts"  element={<Soon title="Contacts & Organizations" />} />
            <Route path="/brokers"   element={<Soon title="Brokers & Agents" />} />
            <Route path="/owners"    element={<Soon title="Property Owners" />} />

            {/* Marketing */}
            <Route path="/campaigns" element={<Soon title="Campaigns" />} />
            <Route path="/calendar"  element={<Soon title="Calendar" />} />

            {/* Reports */}
            <Route path="/reports/sales"       element={<Soon title="Sales Reports" />} />
            <Route path="/reports/performance" element={<Soon title="Agent Performance" />} />

            {/* Documents */}
            <Route path="/documents" element={<Soon title="Documents" />} />
            <Route path="/contracts" element={<Soon title="Contracts" />} />

            {/* System */}
            <Route path="/notifications" element={<Soon title="Notifications" />} />
            <Route path="/maintenance"   element={<Soon title="Maintenance" />} />
            <Route path="/settings"      element={<Soon title="Settings" />} />
            <Route path="/help"          element={<Soon title="Help" />} />
            <Route path="/profile"       element={<ProfilePage />} />

          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
