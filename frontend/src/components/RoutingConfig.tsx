import { useState, useEffect } from "react";
import { Network, SlidersHorizontal, Settings, ShieldAlert, Cpu, Check, AlertTriangle, Play, Loader2 } from "lucide-react";
import { getRoutingConfig, updateRoutingConfig, getThresholds, updateThresholds, testRouting } from "../api/client";
import { cn } from "../lib/utils";

export function RoutingConfig() {
  const [routingTable, setRoutingTable] = useState<Record<string, string>>({});
  const [strategies, setStrategies] = useState<string[]>([]);
  const [thresholds, setThresholdsState] = useState<Record<string, any>>({});
  
  const [isSavingRoute, setIsSavingRoute] = useState(false);
  const [isSavingThresh, setIsSavingThresh] = useState(false);
  
  const [testQuery, setTestQuery] = useState("");
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    getRoutingConfig().then((res) => {
      setRoutingTable(res.routing_table);
      setStrategies(res.available_strategies);
    }).catch(console.error);

    getThresholds().then(setThresholdsState).catch(console.error);
  }, []);

  const handleRouteSave = async () => {
    setIsSavingRoute(true);
    try {
      await updateRoutingConfig(routingTable);
      // Success toast would go here
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingRoute(false);
    }
  };

  const handleThreshSave = async () => {
    setIsSavingThresh(true);
    try {
      await updateThresholds(thresholds);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingThresh(false);
    }
  };

  const handleTest = async () => {
    if (!testQuery.trim()) return;
    setIsTesting(true);
    try {
      const res = await testRouting(testQuery);
      setTestResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTesting(false);
    }
  };

  const weightSum = 
    (thresholds.retrieval_relevance_weight || 0) +
    (thresholds.faithfulness_weight || 0) +
    (thresholds.context_coverage_weight || 0) +
    (thresholds.coherence_weight || 0);

  const isWeightValid = Math.abs(weightSum - 1.0) < 0.01;

  if (Object.keys(routingTable).length === 0 || Object.keys(thresholds).length === 0) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Warning Banner */}
      <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 p-4 rounded-xl flex items-start space-x-3">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold mb-1">In-Memory Configuration</h4>
          <p className="text-sm text-yellow-500/80">
            Changes made here are applied immediately but will reset on server restart. Update your <code className="font-mono bg-yellow-500/20 px-1 rounded">.env</code> file to make changes permanent.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-8">
          
          {/* Routing Table */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center space-x-2">
                <Network className="w-5 h-5 text-indigo-400" />
                <span>Strategy Routing Rules</span>
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {Object.entries(routingTable).map(([queryType, strategy]) => (
                  <div key={queryType} className="flex items-center justify-between bg-gray-950 border border-gray-800 p-3 rounded-lg">
                    <span className="text-sm font-semibold text-gray-300 uppercase tracking-wider">{queryType.replace(/_/g, " ")}</span>
                    <select
                      value={strategy}
                      onChange={(e) => setRoutingTable({ ...routingTable, [queryType]: e.target.value })}
                      className="bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded-md focus:ring-indigo-500 focus:border-indigo-500 block p-2"
                    >
                      {strategies.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleRouteSave}
                  disabled={isSavingRoute}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                >
                  {isSavingRoute ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Save Routing</span>
                </button>
              </div>
            </div>
          </div>

          {/* Test Routing Panel */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center space-x-2">
                <Play className="w-5 h-5 text-green-400" />
                <span>Live Routing Test</span>
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleTest()}
                  placeholder="Enter a test question..."
                  className="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
                />
                <button
                  onClick={handleTest}
                  disabled={isTesting || !testQuery.trim()}
                  className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                >
                  {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Test"}
                </button>
              </div>

              {testResult && (
                <div className="bg-gray-950 border border-gray-800 p-4 rounded-lg space-y-3 mt-4 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 uppercase font-bold">Predicted Class</span>
                    <span className="text-xs font-mono bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded">
                      {testResult.query_type}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 uppercase font-bold">Confidence</span>
                    <span className="text-xs font-bold text-green-400">
                      {(testResult.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 uppercase font-bold">Strategy Selected</span>
                    <span className="text-xs font-mono bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded">
                      {testResult.strategy_selected}
                    </span>
                  </div>
                  {testResult.confidence_override && (
                    <div className="text-xs text-yellow-500 bg-yellow-500/10 p-2 rounded border border-yellow-500/20 mt-2">
                      ⚠️ Confidence below threshold. Default safe strategy was applied.
                    </div>
                  )}
                  <div className="pt-2 border-t border-gray-800">
                    <span className="text-xs text-gray-500 uppercase font-bold block mb-1">Reasoning</span>
                    <p className="text-sm text-gray-400 leading-relaxed italic">"{testResult.reasoning}"</p>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div className="space-y-8">
          
          {/* Thresholds */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center space-x-2">
                <SlidersHorizontal className="w-5 h-5 text-blue-400" />
                <span>System Thresholds</span>
              </h3>
            </div>
            <div className="p-6 space-y-6">
              
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-sm font-medium text-gray-300">Hallucination Threshold</label>
                  <span className="text-sm text-gray-500">{thresholds.hallucination_threshold}</span>
                </div>
                <input
                  type="range" min="0" max="1" step="0.05"
                  value={thresholds.hallucination_threshold}
                  onChange={(e) => setThresholdsState({ ...thresholds, hallucination_threshold: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <p className="text-xs text-gray-500 mt-1">Regenerate answer if hallucination score exceeds this</p>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-sm font-medium text-gray-300">Routing Confidence Threshold</label>
                  <span className="text-sm text-gray-500">{thresholds.routing_confidence_threshold}</span>
                </div>
                <input
                  type="range" min="0" max="1" step="0.05"
                  value={thresholds.routing_confidence_threshold}
                  onChange={(e) => setThresholdsState({ ...thresholds, routing_confidence_threshold: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <p className="text-xs text-gray-500 mt-1">Use safe default strategy if classification below this</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-800">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Max Retrieval Retries</label>
                  <input
                    type="number" min="1" max="5"
                    value={thresholds.max_retrieval_retries}
                    onChange={(e) => setThresholdsState({ ...thresholds, max_retrieval_retries: parseInt(e.target.value) })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Max Generation Retries</label>
                  <input
                    type="number" min="1" max="3"
                    value={thresholds.max_generation_retries}
                    onChange={(e) => setThresholdsState({ ...thresholds, max_generation_retries: parseInt(e.target.value) })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Top K Retrieval</label>
                  <input
                    type="number" min="5" max="50"
                    value={thresholds.top_k_retrieval}
                    onChange={(e) => setThresholdsState({ ...thresholds, top_k_retrieval: parseInt(e.target.value) })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Top K Final (Post-Rerank)</label>
                  <input
                    type="number" min="1" max="10"
                    value={thresholds.top_k_final}
                    onChange={(e) => setThresholdsState({ ...thresholds, top_k_final: parseInt(e.target.value) })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-gray-800">
                <h4 className="text-sm font-semibold text-gray-300 mb-4">Confidence Weights</h4>
                <div className="space-y-4">
                  {[
                    { key: 'retrieval_relevance_weight', label: 'Retrieval Relevance' },
                    { key: 'faithfulness_weight', label: 'Faithfulness' },
                    { key: 'context_coverage_weight', label: 'Context Coverage' },
                    { key: 'coherence_weight', label: 'Coherence' }
                  ].map((w) => (
                    <div key={w.key}>
                      <div className="flex justify-between mb-1">
                        <label className="text-xs text-gray-400">{w.label}</label>
                        <span className="text-xs text-gray-500">{thresholds[w.key]?.toFixed(2)}</span>
                      </div>
                      <input
                        type="range" min="0" max="1" step="0.05"
                        value={thresholds[w.key] || 0}
                        onChange={(e) => setThresholdsState({ ...thresholds, [w.key]: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>
                  ))}
                </div>
                
                <div className={cn(
                  "mt-4 p-2 rounded text-xs flex items-center justify-between border",
                  isWeightValid ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                )}>
                  <span>Weights must sum to 1.00</span>
                  <span className="font-bold">Current: {weightSum.toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-800">
                <h4 className="text-sm font-semibold text-gray-300 mb-4 flex items-center">
                  <ShieldAlert className="w-4 h-4 mr-2 text-orange-400" />
                  Fallback Mechanisms
                </h4>
                <div className="space-y-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-gray-400">Enable Web Search Fallback</span>
                    <input
                      type="checkbox"
                      checked={thresholds.enable_web_search || false}
                      onChange={(e) => setThresholdsState({ ...thresholds, enable_web_search: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="relative w-11 h-6 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-gray-400">Enable LLM General Knowledge Fallback</span>
                    <input
                      type="checkbox"
                      checked={thresholds.enable_llm_fallback || false}
                      onChange={(e) => setThresholdsState({ ...thresholds, enable_llm_fallback: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="relative w-11 h-6 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                  </label>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleThreshSave}
                  disabled={isSavingThresh || !isWeightValid}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                >
                  {isSavingThresh ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
                  <span>Save Configuration</span>
                </button>
              </div>

            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
