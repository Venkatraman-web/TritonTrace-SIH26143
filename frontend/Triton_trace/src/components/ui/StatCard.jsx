export const StatCard = ({ label, value }) => (
  <div className="flex flex-col p-2 bg-white rounded border border-slate-100">
    <span className="text-[9px] font-bold text-slate-400 tracking-wider">{label}</span>
    <span className="text-[11px] font-mono font-bold text-slate-700">{value}</span>
  </div>
);
