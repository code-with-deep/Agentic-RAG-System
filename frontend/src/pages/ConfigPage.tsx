import { useEffect } from "react";
import { RoutingConfig } from "../components/RoutingConfig";
import { useStore } from "../store/useStore";
import { Settings } from "lucide-react";

export default function ConfigPage() {
  const { setActiveTab } = useStore();

  useEffect(() => {
    setActiveTab("config");
  }, [setActiveTab]);

  return (
    <div className="max-w-6xl mx-auto flex flex-col space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
          <Settings className="w-8 h-8 mr-3 text-indigo-500" />
          Agent Configuration
        </h1>
        <p className="text-gray-400">Configure query routing strategies, decision thresholds, and fallback mechanisms.</p>
      </div>

      <RoutingConfig />
    </div>
  );
}
