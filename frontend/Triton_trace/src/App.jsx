import { useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { RoleGuard } from "./components/auth/RoleGuard";
import Layout from "./layout";
import { LandingPage } from "./components/landing/LandingPage";
import { MethodsPage } from "./components/landing/MethodsPage";
import { FaqSection } from "./components/landing/FaqSection";
import { ImpactSection } from "./components/landing/ImpactSection";
import { TopHUD } from "./components/layout/TopHUD";
import { MapCanvas } from "./components/map/MapCanvas";
import { mockIncident } from "./utils/mockData";
import { InvestigatorPortal } from "./components/admin/InvestigatorPortal";
import { CommercialPortal } from "./components/commercial/CommercialPortal";
import { NormalUserPortal } from "./pages/normal/NormalUserPortal";
import { Flame, Eye, ShieldAlert, Ship, LogOut } from "lucide-react";

function PortalWorkspace({ portalType }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [engine, setEngine] = useState("leaflet");

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Role-specific config mapped to the new flat UI colors
  const configs = {
    normal: {
      title: "Researcher Console",
      subtitle: "Marine Research & Local Response",
      colorClass: "text-emerald-600 bg-emerald-50 border-emerald-200",
      icon: Eye,
    },
    admin: {
      title: "Authorities Command Console",
      subtitle: "Maritime Police / Coast Guard / Port State Control",
      colorClass: "text-brand-600 bg-brand-50 border-brand-200",
      icon: ShieldAlert,
    },
    commercial: {
      title: "Commercial Operator Intelligence",
      subtitle: "Shipowner / Fleet / P&I Club Exposure Analysis",
      colorClass: "text-violet-600 bg-violet-50 border-violet-200",
      icon: Ship,
    },
  };

  const currentConfig = configs[portalType] || configs.normal;
  const RoleIcon = currentConfig.icon;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 flex flex-col font-sans select-none">
      {/* TopHUD Mount */}
      <TopHUD
        activeIncidentId={mockIncident.incident_id}
        demoMode={false}
        engine={engine}
      />

      {/* Unblurred Interactive Map Workspace */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        <MapCanvas
          interactive={true}
          onEngineResolved={(eng) => setEngine(eng)}
        />

        {/* Foreground Operational Overlays (Clean White Panels) */}
        <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between z-10">
          {/* Top Left: Target Incident Telemetry Tray */}
          <div className="pointer-events-auto max-w-sm rounded-md border border-slate-200 bg-white p-4 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div className="flex items-center space-x-2">
                <Flame className="h-4 w-4 text-brand-600" />
                <span className="font-mono text-xs font-bold text-slate-800">
                  TARGET: {mockIncident.incident_id}
                </span>
              </div>
              <span className="rounded bg-slate-100 border border-slate-200 px-2 py-0.5 font-mono text-[10px] text-slate-600 font-semibold">
                {mockIncident.status.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[11px] font-mono">
              <div className="rounded bg-slate-50 p-2 border border-slate-100">
                <div className="text-[10px] text-slate-500 font-semibold mb-1">
                  SLICK AREA
                </div>
                <div className="text-slate-900 font-bold">
                  {mockIncident.slick_area_sqkm} km²
                </div>
              </div>
              <div className="rounded bg-slate-50 p-2 border border-slate-100">
                <div className="text-[10px] text-slate-500 font-semibold mb-1">
                  PERIMETER
                </div>
                <div className="text-slate-900 font-bold">
                  {mockIncident.perimeter_km} km
                </div>
              </div>
              <div className="rounded bg-slate-50 p-2 border border-slate-100">
                <div className="text-[10px] text-slate-500 font-semibold mb-1">
                  SURFACE WIND
                </div>
                <div className="text-slate-900 font-bold">
                  {mockIncident.metocean.wind_speed_ms} m/s (
                  {mockIncident.metocean.wind_direction_deg}°)
                </div>
              </div>
              <div className="rounded bg-slate-50 p-2 border border-slate-100">
                <div className="text-[10px] text-slate-500 font-semibold mb-1">
                  CURRENT DRIFT
                </div>
                <div className="text-slate-900 font-bold">
                  {mockIncident.metocean.current_speed_ms} m/s (
                  {mockIncident.metocean.current_direction_deg}°)
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono">
              <span className="text-slate-500 font-medium">
                EST. AGE: {mockIncident.estimated_age_hours} hrs
              </span>
              <span className="text-rose-600 font-bold">
                ELONGATION: {mockIncident.geometry_elongation_ratio}
              </span>
            </div>
          </div>

          {/* Bottom Floating Status Bar */}
          <div className="pointer-events-auto flex flex-col sm:flex-row items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 shadow-md text-xs font-mono">
            <div className="flex items-center space-x-3 text-slate-700">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded border ${currentConfig.colorClass}`}
              >
                <RoleIcon className="h-4 w-4" />
              </div>
              <div>
                <span className="font-semibold text-slate-900">
                  ROUTE: {currentConfig.title}
                </span>
                <span className="text-slate-300 hidden sm:inline mx-2">|</span>
                <span className="text-slate-500 hidden md:inline">
                  {currentConfig.subtitle}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-[11px] text-slate-500 font-mono font-medium">
                OPERATOR: {user?.agency || "AUTHORIZED"}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center space-x-1 rounded border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-600 hover:bg-slate-100 hover:text-rose-600 transition"
              >
                <LogOut className="h-3 w-3" />
                <span className="font-semibold">Switch Role</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public Pages wrapped in Layout (Navbar + Footer) */}
      <Route element={<Layout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/methods" element={<MethodsPage />} />
        <Route path="/faqs" element={<FaqSection />} />
        <Route path="/impact" element={<ImpactSection />} />
      </Route>

      {/* Distinct Portal Route: Normal User */}
      <Route
        path="/portal/normal"
        element={
          <RoleGuard allowedRoles={["normal"]}>
            <NormalUserPortal />
          </RoleGuard>
        }
      />

      {/* Distinct Portal Route: Lead Investigator (Admin) */}
      <Route
        path="/portal/admin"
        element={
          <RoleGuard allowedRoles={["admin"]}>
            <InvestigatorPortal />
          </RoleGuard>
        }
      />

      {/* Distinct Portal Route: Commercial Operator */}
      <Route
        path="/portal/commercial"
        element={
          <RoleGuard allowedRoles={["commercial"]}>
            <CommercialPortal />
          </RoleGuard>
        }
      />

      {/* Catch-all redirect to root */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
