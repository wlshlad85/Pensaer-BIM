/**
 * EIR Compliance Indicator Component
 *
 * Shows green checkmarks for compliant elements and red warnings
 * for missing requirements in the properties panel.
 */

import { useEIRStore } from "../../stores/eirStore";

interface EIRComplianceIndicatorProps {
  elementId: string;
}

/**
 * Inline indicator showing EIR compliance status for a single element.
 * Renders nothing if no EIR is loaded.
 */
export function EIRComplianceIndicator({ elementId }: EIRComplianceIndicatorProps) {
  const loadedEIR = useEIRStore((s) => s.loadedEIR);
  const status = useEIRStore((s) => s.elementComplianceMap[elementId]);
  const messages = useEIRStore((s) => s.elementComplianceMessages[elementId] ?? []);

  if (!loadedEIR) return null;

  if (!status) {
    return (
      <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
        <span>◯</span>
        <span>EIR: Not validated</span>
      </div>
    );
  }

  const statusConfig = {
    pass: {
      icon: "✅",
      label: "EIR Compliant",
      className: "text-green-400",
      bgClassName: "bg-green-500/10 border-green-500/20",
    },
    fail: {
      icon: "❌",
      label: "EIR Non-Compliant",
      className: "text-red-400",
      bgClassName: "bg-red-500/10 border-red-500/20",
    },
    warning: {
      icon: "⚠️",
      label: "EIR Warnings",
      className: "text-yellow-400",
      bgClassName: "bg-yellow-500/10 border-yellow-500/20",
    },
  };

  const config = statusConfig[status];

  return (
    <div className={`mt-2 p-2 rounded border ${config.bgClassName}`}>
      <div className={`flex items-center gap-1.5 text-xs font-medium ${config.className}`}>
        <span>{config.icon}</span>
        <span>{config.label}</span>
      </div>
      {messages.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {messages.map((msg, i) => (
            <li key={i} className="text-xs text-slate-400 pl-5">
              • {msg}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Summary bar showing overall EIR compliance for the properties panel header.
 */
export function EIRComplianceSummary() {
  const loadedEIR = useEIRStore((s) => s.loadedEIR);
  const report = useEIRStore((s) => s.validationReport);

  if (!loadedEIR) return null;

  return (
    <div className="px-3 py-1.5 bg-slate-800/50 border-b border-slate-700/50">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400 font-medium">
          📋 EIR: {loadedEIR.projectName.substring(0, 30)}
        </span>
        {report ? (
          <span className="text-xs">
            <span className="text-green-400">{report.summary.passed}✓</span>
            {" "}
            <span className="text-red-400">{report.summary.failed}✗</span>
            {" "}
            <span className="text-yellow-400">{report.summary.warnings}⚠</span>
          </span>
        ) : (
          <span className="text-xs text-slate-500">Not validated</span>
        )}
      </div>
    </div>
  );
}
