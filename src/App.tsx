import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navigation from "@/components/Navigation";
import AdminDashboard from "./pages/AdminDashboard";
import RegisterCard from "./pages/RegisterCard";
import Scanner from "./pages/Scanner";
import NotFound from "./pages/NotFound";
import Verify from "./pages/Verify";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="min-h-screen bg-background">
          <div className="max-w-6xl mx-auto p-6">
            <Navigation />
            <div className="mt-8">
              <Routes>
                <Route path="/" element={<AdminDashboard />} />
                <Route path="/register" element={<RegisterCard />} />
                <Route path="/scanner" element={<Scanner />} />
                <Route path="/verify" element={<Verify />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </div>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
