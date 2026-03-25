import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { UnitProvider } from "@/contexts/UnitContext";
import { AudioProvider } from "@/contexts/AudioContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { PageTransition } from "@/components/PageTransition";
import Index from "./pages/Index";
import Observer from "./pages/Observer";
import ObserverRamp from "./pages/ObserverRamp";
import Monitor from "./pages/Monitor";
import Admin from "./pages/Admin";
import AdminUnits from "./pages/admin/Units";
import AdminRamps from "./pages/admin/Ramps";
import AdminFoodItems from "./pages/admin/FoodItems";
import AdminSlaRules from "./pages/admin/SlaRules";
import AdminMenu from "./pages/admin/Menu";
import AdminUsers from "./pages/admin/Users";
import AdminReports from "./pages/admin/Reports";
import AdminSchedules from "./pages/admin/Schedules";
import StatsDashboard from "./pages/StatsDashboard";
import Profile from "./pages/Profile";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <PageTransition>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Index />} />
        <Route path="/observer" element={<Observer />} />
        <Route path="/observer/:rampId" element={<ObserverRamp />} />
        <Route path="/monitor" element={<Monitor />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/units" element={<AdminUnits />} />
        <Route path="/admin/ramps" element={<AdminRamps />} />
        <Route path="/admin/food-items" element={<AdminFoodItems />} />
        <Route path="/admin/sla" element={<AdminSlaRules />} />
        <Route path="/admin/menu" element={<AdminMenu />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/reports" element={<AdminReports />} />
        <Route path="/admin/schedules" element={<AdminSchedules />} />
        <Route path="/dashboard" element={<StatsDashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/install" element={<Install />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </PageTransition>
  );
}

const App = () => (
  <ThemeProvider
    attribute="class"
    defaultTheme="dark"
    enableSystem
    disableTransitionOnChange
  >
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AudioProvider>
          <NotificationProvider>
            <UnitProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <AnimatedRoutes />
              </BrowserRouter>
            </UnitProvider>
          </NotificationProvider>
        </AudioProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
