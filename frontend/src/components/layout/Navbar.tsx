import { Link, useLocation } from "react-router-dom";
import { Brain, FileText, SplitSquareHorizontal, BarChart3, Settings, Activity } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";
import { cn } from "../../lib/utils";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

export function Navbar() {
  const location = useLocation();
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        await axios.get(`${API_URL}/health`, { timeout: 2000 });
        setIsOnline(true);
      } catch (err) {
        setIsOnline(false);
      }
    };
    
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { name: "Home", path: "/", icon: Brain },
    { name: "Documents", path: "/documents", icon: FileText },
    { name: "Compare", path: "/compare", icon: SplitSquareHorizontal },
    { name: "Evaluation", path: "/evaluation", icon: BarChart3 },
    { name: "Config", path: "/config", icon: Settings },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-800 bg-gray-950/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <Link to="/" className="flex items-center space-x-2 text-white font-bold text-xl">
            <Brain className="w-6 h-6 text-indigo-500" />
            <span>Agentic RAG</span>
          </Link>
          
          <div className="hidden md:flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-indigo-600/10 text-indigo-400" 
                      : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-xs text-gray-400 bg-gray-900 px-3 py-1.5 rounded-full border border-gray-800">
            <Activity className="w-3 h-3" />
            <span>Backend API</span>
            <span className="relative flex h-2.5 w-2.5 ml-1">
              <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", isOnline ? "bg-green-400" : "bg-red-400")}></span>
              <span className={cn("relative inline-flex rounded-full h-2.5 w-2.5", isOnline ? "bg-green-500" : "bg-red-500")}></span>
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
}
