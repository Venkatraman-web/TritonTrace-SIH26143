import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    question: "How does TritonTrace detect an oil slick in the first place?",
    answer:
      "Slicks are isolated from Sentinel-1 C-SAR satellite imagery, which picks up the way oil dampens surface wave backscatter, then converted into a vector polygon and validated against the raw scene before anything downstream runs.",
  },
  {
    question: "How does the backward hindcast estimate where a spill originated?",
    answer:
      "A multi-member particle ensemble is seeded across the detected slick and driven backward through real ocean current and wind data. Running many perturbed members instead of a single guess produces a density surface — the zones the ensemble revisits most often become the highest-confidence origin candidates.",
  },
  {
    question: "How are vessels attributed to a spill?",
    answer:
      "Candidate origin points are cross-referenced against historical AIS vessel tracks from the same time window. Vessels are scored on how closely their recorded path passes each candidate origin and how well the timing lines up, producing a ranked shortlist rather than a single accusation.",
  },
  {
    question: "Is an AIS correlation score proof that a vessel is responsible?",
    answer:
      "No. It's evidence ranking, not a legal determination — a starting point for investigators to prioritize which vessels warrant further review, not a finding of fault.",
  },
  {
    question: "What happens after a spill is confirmed?",
    answer:
      "TritonTrace runs a forward drift simulation from the detected slick to project where it will travel next, checking particle positions against regional alert geofences in real time so coastal hotspots can be escalated to critical or watch status as they're actually approached.",
  },
  {
    question: "Is this platform using live operational data?",
    answer:
      "This is a demonstration analytical platform. Trajectory backcasts and correlation matrices shown here are simulated models for operational intelligence and do not constitute legal determinations of culpability.",
  },
];

export const FaqSection = () => {
  const [openIndex, setOpenIndex] = useState(0);

  const toggleIndex = (index) => {
    setOpenIndex((current) => (current === index ? -1 : index));
  };

  return (
    <section
      id="faqs"
      className="w-full border-t border-slate-200 bg-white py-20 sm:py-28"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-br from-navy-900 via-brand-600 to-brand-300 bg-clip-text text-transparent mb-10">
          Frequently Asked Questions
        </h2>

        <div className="flex flex-col gap-3">
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={faq.question}
                className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleIndex(index)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left text-sm sm:text-base font-semibold text-slate-900 hover:text-brand-700 transition-colors"
                >
                  {faq.question}
                  <ChevronDown
                    className={`w-4 h-4 flex-shrink-0 text-slate-400 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <p className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">
                    {faq.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FaqSection;
