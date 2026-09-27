import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Waves, ArrowRight } from 'lucide-react';
import { AuthModal } from '../auth/AuthModal';

export default function Navbar() {
  const location = useLocation();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Helper function to dynamically style the active tab
  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { name: 'Platform', path: '/' },
    { name: 'About', path: '/about' },
    { name: 'Impact', path: '/impact' },
    { name: 'Contact', path: '/contact' }
  ];

  return (
    <nav className="sticky top-0 z-50 w-full bg-white border-b border-slate-200 shadow-sm font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* 1. Brand / Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="flex items-center justify-center w-8 h-8 rounded border border-brand-200 bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-100">
              <Waves className="w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">
              Triton<span className="text-brand-600">Trace</span>
            </span>
          </Link>

          {/* 2. Center Navigation Links */}
          <div className="hidden md:flex space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`text-sm font-semibold transition-colors ${
                  isActive(link.path)
                    ? 'text-brand-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* 3. CTA Button (Launch Portal) */}
          <div className="flex items-center">
            <button 
              type="button"
              className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-md text-sm font-bold shadow-sm hover:bg-brand-500 hover:shadow transition-all"
              onClick={() => setIsAuthModalOpen(true)}
            >
              Launch Portal
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </nav>
  );
}