import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { WorkflowHero } from "./WorkflowHero";
import { AuthModal } from "../auth/AuthModal";

export const LandingPage = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const handleLaunchPortal = () => {
    setIsAuthModalOpen(true);
  };

  return (
    <div className="w-full flex flex-col font-sans antialiased overflow-x-hidden">
      {/* 1. Hero Section (Includes Map Preview) */}
      <section id="overview" className="bg-white border-b border-slate-200">
        <WorkflowHero onLaunchPortal={handleLaunchPortal} />
      </section>

      <div className="w-full h-75 md:h-112.5 lg:h-150 overflow-hidden border-y border-slate-200">
        <img
          src="/oilspill.jpg" /* <-- Change this to your exact file name */
          alt="Marine environment"
          className="w-full h-full object-cover object-center"
        />
      </div>

      {/* 2. Why TritonTrace + Resources */}
      <section
        id="why"
        className="relative w-full overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50 py-20 sm:py-28"
      >
        {/* Soft artistic backdrop — soothing oceanic glow, decorative only */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-brand-200/40 blur-3xl" />
          <div className="absolute top-1/3 -right-32 w-[28rem] h-[28rem] rounded-full bg-navy-700/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-72 h-72 rounded-full bg-brand-100/50 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-4">
            <h2 className="text-7xl sm:text-8xl font-extrabold tracking-tight bg-gradient-to-br from-navy-900 via-brand-600 to-brand-300 bg-clip-text text-transparent">
              Why
            </h2>
          </div>

          <div className="lg:col-span-8 flex flex-col gap-8">
            <p className="text-lg text-slate-600 leading-relaxed max-w-2xl">
              Chronic marine oil pollution rarely leaves a confession behind —
              bilge dumping and unreported discharges are quick, deliberate,
              and nearly impossible to trace back to a single vessel after
              the fact. We built TritonTrace to close that gap: by fusing
              satellite SAR detections with backward drift physics and AIS
              transponder history, it reconstructs where a slick most likely
              originated and which vessels were plausibly present, turning a
              scattered trail of public data into an evidentiary starting
              point for investigators, port authorities, and coast guards.
              The same reconstruction works both ways for enterprises: fleet
              operators and P&amp;I clubs can use it to generate a verifiable
              alibi for their own vessels, clearing them of suspicion and
              speeding up insurance and liability claims instead of leaving
              them exposed to a wrongful detention.
            </p>

            <div className="rounded-xl border border-slate-200 bg-white/70 backdrop-blur-sm shadow-sm p-6 sm:p-8">
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                TritonTrace Resources
              </h3>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/impact"
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-brand-300 hover:text-brand-700 transition-colors"
                >
                  Impact
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/methods"
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-brand-300 hover:text-brand-700 transition-colors"
                >
                  Methods
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/faqs"
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-brand-300 hover:text-brand-700 transition-colors"
                >
                  FAQs
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Role Gateway & Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
};

export default LandingPage;
