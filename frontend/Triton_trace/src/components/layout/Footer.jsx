import { Link } from "react-router-dom";
import { Waves } from "lucide-react";

const FOOTER_LINKS = [
  {
    heading: "Navigate",
    links: [
      { label: "Platform", to: "/" },
      { label: "About", to: "/about" },
      { label: "Impact", to: "/impact" },
      { label: "Contact", to: "/contact" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Overview", to: "/#overview" },
      { label: "Why TritonTrace", to: "/#why" },
      { label: "Impact & Benefits", to: "/impact" },
      { label: "Methods", to: "/methods" },
      { label: "FAQs", to: "/faqs" },
    ],
  },
];

export default function Footer() {
  return (
    <footer id="disclaimer" className="w-full bg-navy-950 border-t border-navy-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-6">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded border border-brand-800 bg-brand-950/40 text-brand-400">
                <Waves className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg tracking-tight text-white">
                Triton<span className="text-brand-400">Trace</span>
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm text-slate-400 leading-relaxed">
              Marine oil spill forensic intelligence — fusing satellite SAR
              detections, drift physics, and AIS vessel history into an
              evidentiary starting point for investigators and authorities.
            </p>
          </div>

          {FOOTER_LINKS.map((column) => (
            <div key={column.heading} className="md:col-span-3">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                {column.heading}
              </h3>
              <ul className="flex flex-col gap-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-sm text-slate-300 hover:text-brand-400 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-navy-800 flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs">
          <div className="flex items-center space-x-2 text-slate-400">
            <span className="font-semibold text-white">TRITONTRACE</span>
            <span>·</span>
            <span>Marine Oil Spill Forensic Intelligence Console</span>
          </div>

          <div className="text-center md:text-right max-w-xl text-[11px] text-slate-500 leading-normal">
            Demonstration analytical platform. Trajectory backcasts and correlation matrices are simulated models
            for operational intelligence and do not constitute legal determinations of culpability.
          </div>
        </div>
      </div>
    </footer>
  );
}
