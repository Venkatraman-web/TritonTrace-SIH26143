import { useState } from "react";

const SECTIONS = [
  { id: "overview", label: "How TritonTrace Works" },
  { id: "detection", label: "SAR Slick Detection & Validation" },
  { id: "hindcast", label: "Backward Drift Hindcast" },
  { id: "attribution", label: "AIS Vessel Attribution" },
  { id: "forward", label: "Forward Trajectory & Hotspot Alerts" },
  { id: "sources", label: "Data Sources" },
];

const DATA_SOURCES = [
  {
    data: "Sentinel-1 C-SAR (GRD)",
    purpose: "Oil slick detection & SAR polygon extraction",
    source: "European Space Agency, via Copernicus Open Data",
  },
  {
    data: "CMEMS physical ocean analysis",
    purpose: "Surface currents driving the backward/forward drift model",
    source: "Copernicus Marine Environment Monitoring Service",
  },
  {
    data: "NOAA GFS surface winds",
    purpose: "Wind forcing for drift & weathering physics",
    source: "NOAA Global Forecast System",
  },
  {
    data: "Historical AIS vessel tracks",
    purpose: "Correlating vessel positions with hindcast origin candidates",
    source: "Marine Cadastre AIS archive",
  },
  {
    data: "Regional alert geofences",
    purpose: "Critical / watch zone boundaries for forward-track alerts",
    source: "Internal TritonTrace geofence definitions",
  },
];

export const MethodsPage = () => {
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);

  const handleNavClick = (id) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="w-full bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Sidebar table of contents */}
        <aside className="lg:col-span-3">
          <nav className="lg:sticky lg:top-24 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <ul className="flex flex-col gap-1">
              {SECTIONS.map((section) => (
                <li key={section.id}>
                  <button
                    type="button"
                    onClick={() => handleNavClick(section.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeSection === section.id
                        ? "bg-brand-100 text-brand-700"
                        : "text-slate-600 hover:bg-white hover:text-slate-900"
                    }`}
                  >
                    {section.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Content */}
        <div className="lg:col-span-9 flex flex-col gap-20">
          <section id="overview" className="scroll-mt-24">
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-br from-navy-900 via-brand-600 to-brand-300 bg-clip-text text-transparent mb-6">
              How TritonTrace Works
            </h1>
            <p className="text-base text-slate-600 leading-relaxed max-w-3xl">
              TritonTrace turns a single satellite detection of an oil slick
              into an evidentiary chain: it validates the detection, runs a
              backward hindcast to estimate where the discharge most likely
              originated, cross-references that origin against AIS vessel
              traffic, and — once a spill is confirmed — runs a forward
              trajectory to flag which coastal hotspots are at risk next.
            </p>
          </section>

          <section id="detection" className="scroll-mt-24">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              1. SAR Slick Detection & Validation
            </h2>
            <p className="text-base text-slate-600 leading-relaxed max-w-3xl mb-6">
              Each candidate slick is first isolated from Sentinel-1 C-SAR
              backscatter imagery and converted into a vector polygon. Before
              anything downstream runs, the detected polygon is validated
              against the raw scene to confirm alignment between the
              predicted slick boundary and the actual backscatter
              suppression footprint.
            </p>
            <figure className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
              <img
                src="/methods/sar-validation.png"
                alt="SAR detection validated against the raw satellite scene"
                className="w-full h-auto object-contain"
              />
              <figcaption className="px-4 py-3 text-xs text-slate-500 border-t border-slate-200">
                Validation overlay confirming the detected slick polygon
                aligns with the Sentinel-1 backscatter suppression region.
              </figcaption>
            </figure>
          </section>

          <section id="hindcast" className="scroll-mt-24">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              2. Backward Drift Hindcast
            </h2>
            <p className="text-base text-slate-600 leading-relaxed max-w-3xl mb-6">
              A multi-member particle ensemble is seeded across the detected
              slick and driven backward through CMEMS ocean currents and NOAA
              GFS winds. Running many perturbed members instead of a single
              trajectory produces a density surface rather than one guess —
              areas the ensemble revisits most often become the highest-
              confidence candidate origin zones.
            </p>
            <figure className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
              <img
                src="/methods/hindcast-heatmap.png"
                alt="Hindcast particle density heatmap"
                className="w-full h-auto object-contain"
              />
              <figcaption className="px-4 py-3 text-xs text-slate-500 border-t border-slate-200">
                Backward hindcast density heatmap — warmer cells were
                revisited by more ensemble members, indicating higher-
                confidence origin candidates.
              </figcaption>
            </figure>
          </section>

          <section id="attribution" className="scroll-mt-24">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              3. AIS Vessel Attribution
            </h2>
            <p className="text-base text-slate-600 leading-relaxed max-w-3xl mb-6">
              Candidate origin points are cross-referenced against historical
              AIS vessel tracks in the same time window. Vessels are scored
              on how closely their recorded path passes each candidate origin
              and how well the timing lines up, producing a ranked shortlist
              of the vessels most plausibly responsible.
            </p>
            <figure className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
              <img
                src="/methods/ais-top15-tracks.png"
                alt="Top 15 AIS vessel tracks correlated with the origin candidates"
                className="w-full h-auto object-contain"
              />
              <figcaption className="px-4 py-3 text-xs text-slate-500 border-t border-slate-200">
                The top-15 AIS-correlated vessel tracks, ranked and overlaid
                against the hindcast origin candidates.
              </figcaption>
            </figure>
            <figure className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 mt-6">
              <img
                src="/methods/source-attribution.png"
                alt="Origin candidates matched to AIS attribution"
                className="w-full h-auto object-contain"
              />
              <figcaption className="px-4 py-3 text-xs text-slate-500 border-t border-slate-200">
                Origin candidates matched against attributed vessel activity,
                narrowing the field down to the most likely source.
              </figcaption>
            </figure>
          </section>

          <section id="forward" className="scroll-mt-24">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              4. Forward Trajectory & Hotspot Alerts
            </h2>
            <p className="text-base text-slate-600 leading-relaxed max-w-3xl mb-6">
              Once a spill is confirmed, TritonTrace runs a forward drift
              simulation from the detected slick to project where it will
              travel next. Particle positions are checked against regional
              alert geofences in real time — a hotspot is only escalated to
              critical once particles actually enter its inner zone, and to
              watch status if they enter the wider buffer, rather than
              relying on a static distance threshold.
            </p>
            <figure className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
              <img
                src="/methods/forward-trajectory-result.png"
                alt="Forward trajectory simulation result"
                className="w-full h-auto object-contain"
              />
              <figcaption className="px-4 py-3 text-xs text-slate-500 border-t border-slate-200">
                Final forward-drift trajectory result, used to determine
                which coastal hotspots are at risk.
              </figcaption>
            </figure>
          </section>

          <section id="sources" className="scroll-mt-24">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              5. Data Sources
            </h2>
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wider">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Data</th>
                    <th className="px-4 py-3 font-semibold">Purpose</th>
                    <th className="px-4 py-3 font-semibold">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {DATA_SOURCES.map((row) => (
                    <tr key={row.data}>
                      <td className="px-4 py-3 font-medium text-slate-900 align-top">
                        {row.data}
                      </td>
                      <td className="px-4 py-3 text-slate-600 align-top">
                        {row.purpose}
                      </td>
                      <td className="px-4 py-3 text-slate-600 align-top">
                        {row.source}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default MethodsPage;
