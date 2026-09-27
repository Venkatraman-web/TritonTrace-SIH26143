import { ShieldAlert, Anchor, Ship, Microscope, Leaf, TrendingUp, Scale } from "lucide-react";

const STAKEHOLDER_IMPACTS = [
  {
    icon: ShieldAlert,
    title: "Coast Guard & Navy",
    description:
      "Automates suspect vessel ranking to compress forensic attribution from weeks into minutes, enabling immediate investigative response.",
    colorClass: "bg-rose-50 border-rose-200 text-rose-600",
  },
  {
    icon: Anchor,
    title: "Port Authorities",
    description:
      "Early warning alerts protect commercial shipping lanes, docks, and coastal fishing fleets.",
    colorClass: "bg-emerald-50 border-emerald-200 text-emerald-600",
  },
  {
    icon: Ship,
    title: "Commercial Shipping & Insurance",
    description:
      "Prevents wrongful detentions via verifiable alibis and streamlines insurance claims with precise spill data.",
    colorClass: "bg-brand-50 border-brand-200 text-brand-600",
  },
  {
    icon: Microscope,
    title: "Researchers",
    description:
      "Provides high-resolution hydrodynamic drift analytics and historical spill hotspot mapping to advance marine conservation and climate studies.",
    colorClass: "bg-amber-50 border-amber-200 text-amber-600",
  },
];

const SOLUTION_BENEFITS = [
  {
    icon: Leaf,
    title: "Environmental",
    description:
      "Accelerates containment boom deployment, preventing toxic hydrocarbons from reaching fragile coastal ecosystems, coral reefs, and mangroves.",
  },
  {
    icon: TrendingUp,
    title: "Economic",
    description:
      "Mitigates multimillion-dollar disaster cleanup operations and provides the evidentiary basis to hold responsible vessel operators financially accountable.",
  },
  {
    icon: Scale,
    title: "Legal & Ops",
    description:
      "Eliminates inter-agency delays through a single source of truth, converting complex hydrodynamic simulations into an automated, tamper-proof legal dossier.",
  },
];

export const ImpactSection = () => (
  <section
    id="impact"
    className="w-full border-t border-slate-200 bg-slate-50 py-20 sm:py-28"
  >
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-br from-navy-900 via-brand-600 to-brand-300 bg-clip-text text-transparent mb-4">
        Impact & Benefits
      </h2>
      <p className="text-base text-slate-600 leading-relaxed max-w-2xl mb-12">
        Protecting our oceans through precise, data-driven maritime
        attribution and accountability.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
        {STAKEHOLDER_IMPACTS.map(({ icon: Icon, title, description, colorClass }) => (
          <div
            key={title}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div
              className={`w-10 h-10 rounded-lg border flex items-center justify-center mb-4 ${colorClass}`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">{title}</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {description}
            </p>
          </div>
        ))}
      </div>

      <h3 className="text-lg font-bold text-slate-900 mb-6">
        Benefits of the Solution
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {SOLUTION_BENEFITS.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="w-10 h-10 rounded-lg border border-slate-200 bg-slate-100 text-navy-800 flex items-center justify-center mb-4">
              <Icon className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-slate-900 mb-2">{title}</h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              {description}
            </p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default ImpactSection;
