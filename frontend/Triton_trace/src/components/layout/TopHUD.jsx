import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useIncident } from '../../context/IncidentContext';
import {
  Radar,
  LogOut,
  Bell,
  Globe2,
  Activity,
  Sparkles,
  Shield,
  Eye,
  Ship
} from 'lucide-react';

export const TopHUD = ({ demoMode = false, onToggleDemo, engine = 'leaflet' }) => {
  const { role, user, logout, roleDefinition } = useAuth();
  const { resetIncidentSession } = useIncident();
  const navigate = useNavigate();

  const handleLogout = () => {
    resetIncidentSession();
    logout();
    navigate('/');
  };

  const getRoleIcon = () => {
    if (role === 'admin') return <Shield className="h-3.5 w-3.5" />;
    if (role === 'commercial') return <Ship className="h-3.5 w-3.5" />;
    return <Eye className="h-3.5 w-3.5" />;
  };

  const getRoleBadgeClasses = () => {
    if (role === 'admin') {
      return 'border-brand-500/30 bg-brand-500/10 text-brand-300';
    }
    if (role === 'commercial') {
      return 'border-violet-500/30 bg-violet-500/10 text-violet-300';
    }
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  };

  return (
    <header className="relative z-30 flex h-14 w-full items-center justify-between border-b border-navy-800 bg-navy-950 px-4 shadow-lg shadow-navy-950/40 select-none text-white">
      {/* Left: Brand + Active Incident + AOI */}
      <div className="flex items-center space-x-4">
        {/* Wordmark */}
        <div className="flex items-center space-x-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-brand-500/30 bg-gradient-to-br from-brand-500/20 to-brand-700/20 text-brand-400">
            <Radar className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center space-x-1.5">
              <span className="font-mono text-sm font-bold tracking-wider text-white">TRITONTRACE</span>
              <span className="rounded bg-navy-800 px-1 py-0.2 font-mono text-[9px] font-semibold text-brand-400 border border-navy-700">v2.0</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium tracking-tight">MARITIME FORENSIC INTELLIGENCE</span>
          </div>
        </div>

        <div className="h-5 w-px bg-navy-800 hidden sm:block" />

        {/* AOI Location */}
        <div className="hidden md:flex items-center space-x-1.5 text-xs text-slate-400">
          <Globe2 className="h-3.5 w-3.5 text-slate-500" />
          <span className="font-mono text-[11px] text-slate-300 font-medium">Eastern Mediterranean AOI</span>
          <span className="text-[10px] font-mono text-slate-500">(31.35°N, 31.69°E)</span>
        </div>
      </div>

      {/* Right: Engine Status + Role Badge + Demo + Logout */}
      <div className="flex items-center space-x-3">
        {/* System & Engine Status */}
        <div className="hidden lg:flex items-center space-x-1.5 rounded border border-navy-800 bg-navy-900 px-2 py-0.5 font-mono text-[10px] text-slate-400">
          <Activity className="h-3 w-3 text-emerald-400" />
          <span className="text-slate-200 font-semibold">SYS: ONLINE</span>
          <span className="text-navy-700">|</span>
          <span className="text-slate-500 uppercase">GEO: {engine}</span>
        </div>

        {/* Active Role Badge */}
        <div className={`flex items-center space-x-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold font-mono ${getRoleBadgeClasses()}`}>
          {getRoleIcon()}
          <span>{roleDefinition?.badge || role?.toUpperCase()}</span>
        </div>

        {/* Demo Mode Toggle/Indicator */}
        {onToggleDemo && (
          <button
            type="button"
            onClick={onToggleDemo}
            className={`hidden sm:flex items-center space-x-1.5 rounded border px-2.5 py-1 text-xs font-mono font-medium transition cursor-pointer ${
              demoMode
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                : 'border-navy-800 bg-navy-900 text-slate-400 hover:bg-navy-800 hover:text-white'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>DEMO MODE</span>
          </button>
        )}

        {/* Notifications */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-8 w-8 items-center justify-center rounded-md border border-navy-800 bg-navy-900 text-slate-400 hover:text-white hover:bg-navy-800 transition cursor-pointer"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-brand-500" />
        </button>

        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          title="Exit Session"
          className="flex items-center space-x-1.5 rounded-md border border-navy-800 bg-navy-900 px-2.5 py-1 text-xs font-medium text-slate-400 hover:bg-navy-800 hover:text-rose-400 transition cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline font-semibold">Logout</span>
        </button>
      </div>
    </header>
  );
};

export default TopHUD;
