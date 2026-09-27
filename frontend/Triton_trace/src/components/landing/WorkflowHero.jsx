export const WorkflowHero = ({ onLaunchPortal }) => {
  return (
    <div className="w-full bg-navy-950 border-b border-navy-800 py-16 md:py-24 lg:py-32">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">

        {/* Cerulean's "product-header-2-col" equivalent */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 xl:gap-16 items-start">

          {/* Left Column (Heading) */}
          <div className="xl:col-span-5">
            <h1 className="text-5xl sm:text-6xl xl:text-7xl font-extrabold tracking-tight bg-gradient-to-br from-white via-brand-200 to-brand-400 bg-clip-text text-transparent m-0 leading-none">
              TritonTrace
            </h1>
          </div>

          {/* Right Column (Description & Button) */}
          <div className="xl:col-span-7 flex flex-col items-start gap-8 xl:pt-4">

            <p className="text-lg sm:text-xl text-slate-300 leading-relaxed max-w-2xl">
              An end-to-end automated platform that uses AI, satellite SAR imagery, and oceanographic modeling to expose chronic marine oil pollution and attribute it to suspect vessels.
            </p>

            {/* Solid, impactful primary action with luminous cyan glow on hover */}
            <button
              onClick={onLaunchPortal}
              className="group inline-flex items-center gap-3 px-7 py-4 bg-brand-500 text-navy-950 text-sm font-bold tracking-wide rounded-xl shadow-lg shadow-brand-500/20 hover:bg-brand-400 hover:shadow-xl hover:shadow-brand-400/30 active:bg-brand-600 transition-all duration-300"
            >
              <span>Launch TritonTrace</span>

              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 18 14"
                fill="none"
                className="w-5 h-4 transition-transform duration-300 group-hover:translate-x-1"
              >
                <circle cx="1" cy="7" r="1" fill="currentColor"></circle>
                <circle cx="4" cy="7" r="1" fill="currentColor"></circle>
                <circle cx="7" cy="7" r="1" fill="currentColor"></circle>
                <circle cx="10" cy="7" r="1" fill="currentColor"></circle>
                <circle cx="13" cy="7" r="1" fill="currentColor"></circle>
                <circle cx="13" cy="11" r="1" fill="currentColor"></circle>
                <circle cx="11" cy="13" r="1" fill="currentColor"></circle>
                <circle cx="11" cy="1" r="1" fill="currentColor"></circle>
                <circle cx="13" cy="3" r="1" fill="currentColor"></circle>
                <circle cx="15" cy="5" r="1" fill="currentColor"></circle>
                <circle cx="17" cy="7" r="1" fill="currentColor"></circle>
                <circle cx="15" cy="9" r="1" fill="currentColor"></circle>
              </svg>
            </button>

          </div>

        </div>
      </div>
    </div>
  );
};

export default WorkflowHero;