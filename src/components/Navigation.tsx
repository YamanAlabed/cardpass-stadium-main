import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Shield, QrCode, Smartphone } from "lucide-react";

const Navigation = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <Card className="w-full max-w-4xl mx-auto p-6 shadow-lg">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-field to-primary rounded-lg">
            <img src="/borntal.avif" alt="" className="w-20 h-20" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">FC Borntal Erfurt e.V.</h1>
            <p className="text-sm text-muted-foreground">Football Fan Management System</p>
          </div>
        </div>

        <nav className="flex gap-2">
          <Link to="/">
            <Button 
              variant={isActive("/") ? "default" : "outline"}
              className="flex items-center gap-2"
            >
              <Shield className="w-4 h-4" />
              Admin Dashboard
            </Button>
          </Link>
          
          <Link to="/register">
            <Button 
              variant={isActive("/register") ? "default" : "outline"}
              className="flex items-center gap-2"
            >
              <QrCode className="w-4 h-4" />
              Register Cards
            </Button>
          </Link>
          <Link to="/verify">
            <Button 
              variant={isActive("/verify") ? "default" : "outline"}
              className="flex items-center gap-2"
            >
              <Smartphone className="w-4 h-4" />
              Verify
            </Button>
          </Link>
        </nav>
      </div>
    </Card>
  );
};

export default Navigation;