"use client";

import { useState } from "react";

type PipelineStep = {
  step: string;
  value: unknown;
  timestamp: string;
};

const STEP_COLORS: Record<string, string> = {
  transcript: "bg-blue-500",
  tool_call: "bg-purple-500",
  tool_result: "bg-green-500",
  final_response: "bg-orange-500",
};

export function DebugPanel({ steps }: { steps: PipelineStep[] }) {
  const [expanded, setExpanded] = useState(false);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  if (steps.length === 0) return null;

  const toggleStep = (i: number) => {
    setExpandedStep(expandedStep === i ? null : i);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-lg">
      <button
        onClick={() => setExpanded(!expanded)}
        className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-mono hover:bg-slate-700 flex items-center gap-2"
      >
        <span className="text-xs">🔧</span>
        Pipeline {expanded ? "▼" : "▲"}
        <span className="bg-slate-700 px-2 py-0.5 rounded text-xs">{steps.length}</span>
      </button>

      {expanded && (
        <div className="mt-2 bg-slate-900 rounded-lg p-4 max-h-[60vh] overflow-y-auto border border-slate-700 shadow-xl">
          {steps.map((step, i) => (
            <div
              key={i}
              className="mb-2 pb-2 border-b border-slate-800 last:border-0 cursor-pointer hover:bg-slate-800 rounded px-2"
              onClick={() => toggleStep(i)}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${STEP_COLORS[step.step] || "bg-gray-500"}`} />
                <span className="text-xs font-mono text-slate-300">{step.step}</span>
                <span className="text-xs text-slate-600 ml-auto">
                  {new Date(step.timestamp).toLocaleTimeString()}
                </span>
                {typeof step.value === "object" && (
                  <span className="text-xs text-slate-500">📦</span>
                )}
              </div>

              {/* Collapsible content */}
              {expandedStep === i ? (
                <pre className="mt-2 text-xs text-green-400 whitespace-pre-wrap font-mono bg-slate-950 p-2 rounded">
                  {JSON.stringify(step.value, null, 2)}
                </pre>
              ) : (
                <div className="mt-1 text-xs text-slate-500 truncate">
                  {typeof step.value === "string" ? step.value : JSON.stringify(step.value)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
