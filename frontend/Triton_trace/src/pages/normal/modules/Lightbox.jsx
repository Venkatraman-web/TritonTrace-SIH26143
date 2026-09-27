import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

// Fullscreen, scaled-up view of anything — a reference image or a live
// chart — closes on Escape, clicking the backdrop, or the close button.
// Click on the content itself does nothing, so a mis-click doesn't
// dismiss it.
//
// Rendered via a portal straight into <body>: this component is normally
// mounted deep inside the sidebar tree, and an ancestor there (the
// collapsible sidebar wrapper) has its own `z-20`, which creates a CSS
// stacking context — any `position: fixed` descendant is trapped inside
// it regardless of its own z-index, so without the portal this lightbox
// would render *underneath* TopHUD's `z-30` header instead of above it.
export const Lightbox = ({ isOpen, onClose, caption, children }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
      role="button"
      tabIndex={-1}
      aria-label="Close enlarged view"
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors"
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-full cursor-default"
      >
        {children}
      </div>
      {caption && (
        <span className="absolute bottom-5 left-1/2 -translate-x-1/2 text-[11px] text-slate-300 bg-slate-900/70 px-3 py-1.5 rounded-md">
          {caption}
        </span>
      )}
    </div>,
    document.body,
  );
};
