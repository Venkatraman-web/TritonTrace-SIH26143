export const StatCard = ({ label, value }) => (
  <div className="flex flex-col p-2 bg-navy-900 rounded border border-navy-800">
    <span className="text-[9px] font-bold text-slate-500 tracking-wider">{label}</span>
    <span className="text-[11px] font-mono font-bold text-slate-300">{value}</span>
  </div>
);
