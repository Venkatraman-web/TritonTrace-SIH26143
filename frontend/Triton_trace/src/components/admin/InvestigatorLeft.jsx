import { PanelLeftClose } from "lucide-react";
import { TriageQueue } from "./modules/TriageQueue";

export const InvestigatorLeft = ({ onCollapse }) => {
  return (
    <aside className="w-full h-full bg-white flex flex-col shrink-0 z-40 border-r border-slate-200">
      {/* Header Navigation - Crisp White & Flat */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex flex-col">
          <span className="text-xs font-bold tracking-wider text-slate-900">
            INCIDENT TRIAGE & FORENSICS
          </span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-bold tracking-widest text-emerald-600 uppercase">
              LIVE QUEUE
            </span>
          </div>
        </div>

        {/* Dedicated Collapse Button */}
        <button
          onClick={onCollapse}
          className="shrink-0 p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-200 rounded transition-colors"
          title="Collapse Panel"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* Module Container */}
      <div className="flex-1 overflow-y-auto px-4 py-3 custom-scrollbar">
        <TriageQueue />
      </div>
    </aside>
  );
};
