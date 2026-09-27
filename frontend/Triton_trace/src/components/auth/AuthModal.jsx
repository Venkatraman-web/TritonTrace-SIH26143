import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, ROLE_DEFINITIONS } from '../../context/AuthContext';
import { 
  ShieldAlert,  
  Eye, 
  Ship, 
  ArrowRight, 
  ArrowLeft, 
  KeyRound, 
  Lock, 
  Building2, 
  Mail, 
  CheckCircle2, 
  Satellite, 
  AlertCircle,
  X 
} from 'lucide-react';

const ROLE_ICONS = {
  normal: Eye,
  admin: ShieldAlert,
  commercial: Ship
};

const DEFAULT_CREDENTIALS = {
  normal: {
    email: 'observer.malta@marine-patrol.org',
    password: '••••••••••••',
    agency: 'MED-PATROL-UNIT-07'
  },
  admin: {
    email: 'investigator.vassallo@coastguard.gov.mt',
    password: '••••••••••••',
    agency: 'IT-CG-FORENSIC-DIV-04'
  },
  commercial: {
    email: 'legal.claims@pacificmaritime.com',
    password: '••••••••••••',
    agency: 'IMO-9482914 / P&I-CLUB-UK'
  }
};

export const AuthModal = ({ isOpen = true, onClose }) => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Role Select, 2: Credentials
  const [selectedRole, setSelectedRole] = useState('admin');
  const [credentials, setCredentials] = useState({
    email: DEFAULT_CREDENTIALS.admin.email,
    password: 'password123',
    agency: DEFAULT_CREDENTIALS.admin.agency
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleRoleSelect = (roleKey) => {
    setSelectedRole(roleKey);
    setCredentials({
      email: DEFAULT_CREDENTIALS[roleKey].email,
      password: 'password123',
      agency: DEFAULT_CREDENTIALS[roleKey].agency
    });
    setError('');
  };

  const handleNextStep = () => {
    if (!selectedRole) {
      setError('Please select an operational role.');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleQuickEnter = (roleKey) => {
    const targetRole = roleKey || selectedRole;
    login(targetRole, DEFAULT_CREDENTIALS[targetRole] || {});
    if (onClose) onClose();
    navigate(`/portal/${targetRole}`);
  };

  const handlePrevStep = () => {
    setError('');
    setStep(1);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!credentials.email || !credentials.agency) {
      setError('Please provide all mandatory credential identifiers.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    // Simulate realistic authorization handshake then route to respective portal
    setTimeout(() => {
      login(selectedRole, credentials);
      setIsSubmitting(false);
      if (onClose) onClose();
      navigate(`/portal/${selectedRole}`);
    }, 250);
  };

  const activeRoleDef = ROLE_DEFINITIONS[selectedRole];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop overlay — soft oceanic gradient instead of flat slate */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-navy-950/70 via-navy-900/50 to-brand-900/40 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
      />

      {/* Soothing gradient Modal Box */}
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-br from-white via-white to-brand-50/60 p-7 sm:p-9 shadow-2xl shadow-navy-900/20 transition-all text-slate-900">
        {/* Decorative soft glow, purely cosmetic */}
        <div className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 rounded-full bg-brand-200/30 blur-3xl" />

        {/* Top telemetry strip */}
        <div className="relative mb-6 flex items-center justify-between border-b border-brand-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-brand-300 bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm shadow-brand-500/30">
              <Satellite className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold tracking-widest text-brand-600">TRITONTRACE</span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 border border-slate-200">SECURE GATEWAY</span>
              </div>
              <h2 className="text-sm font-semibold text-slate-800">Forensic Access Control & RBAC</h2>
            </div>
          </div>

          <div className="flex items-center space-x-3 font-mono text-xs">
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium border border-slate-200 bg-slate-50 text-slate-700">
              STEP {step} / 2
            </span>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-5 flex items-center space-x-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: ROLE SELECTION */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Select Operational Role</h3>
              <p className="mt-1 text-xs text-slate-600">
                Choose domain authorization level. Permissions and available forensic tools will adapt accordingly.
              </p>
            </div>

            <div className="grid gap-3 pt-2">
              {Object.values(ROLE_DEFINITIONS).map((r) => {
                const IconComponent = ROLE_ICONS[r.id] || ShieldAlert;
                const isSelected = selectedRole === r.id;

                let borderStyle = 'border-slate-200 hover:border-slate-300 bg-slate-50/60';
                if (isSelected) {
                  if (r.accentColor === 'cyan') borderStyle = 'border-brand-600 bg-brand-50/50 ring-1 ring-brand-500';
                  else if (r.accentColor === 'emerald') borderStyle = 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-500';
                  else borderStyle = 'border-violet-600 bg-violet-50/50 ring-1 ring-violet-500';
                }

                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleRoleSelect(r.id)}
                    className={`flex items-start space-x-4 rounded-lg border p-3.5 text-left transition-all duration-150 cursor-pointer ${borderStyle}`}
                  >
                    <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                      isSelected
                        ? r.accentColor === 'cyan'
                          ? 'border-brand-200 bg-brand-50 text-brand-600'
                          : r.accentColor === 'emerald'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                          : 'border-violet-200 bg-violet-50 text-violet-600'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}>
                      <IconComponent className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-900">{r.title}</span>
                        {r.badge && !r.hideBadgeInPicker && (
                          <span className={`font-mono text-[10px] uppercase px-2 py-0.5 rounded border ${
                            isSelected
                              ? r.accentColor === 'cyan'
                                ? 'bg-brand-50 text-brand-700 border-brand-200 font-semibold'
                                : r.accentColor === 'emerald'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold'
                                : 'bg-violet-50 text-violet-700 border-violet-200 font-semibold'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {r.badge}
                          </span>
                        )}
                      </div>
                      {r.subtitle && (
                        <div className="text-xs text-slate-500 font-medium">{r.subtitle}</div>
                      )}
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{r.description}</p>
                    </div>

                    {isSelected && (
                      <CheckCircle2 className={`h-5 w-5 shrink-0 ${
                        r.accentColor === 'cyan' ? 'text-brand-600' : r.accentColor === 'emerald' ? 'text-emerald-600' : 'text-violet-600'
                      }`} />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleQuickEnter(selectedRole)}
                className="text-[11px] text-slate-600 hover:text-brand-600 font-mono transition flex items-center space-x-1 font-semibold cursor-pointer"
              >
                <span>⚡ Instant Entry ({ROLE_DEFINITIONS[selectedRole]?.title})</span>
              </button>

              <button
                type="button"
                onClick={handleNextStep}
                className="flex items-center space-x-2 rounded-lg bg-brand-600 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-brand-500 active:bg-brand-700 cursor-pointer shadow-sm"
              >
                <span>Proceed to Credentials</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: CREDENTIAL VERIFICATION */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">Authenticate Credentials</h3>
                {/* Active Role Chip */}
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center space-x-1.5 rounded-full px-2.5 py-1 text-xs font-mono font-medium border ${
                    activeRoleDef.accentColor === 'cyan'
                      ? 'border-brand-200 bg-brand-50 text-brand-700'
                      : activeRoleDef.accentColor === 'emerald'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-violet-200 bg-violet-50 text-violet-700'
                  }`}>
                    <span>{activeRoleDef.title}</span>
                  </span>
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="text-[11px] text-brand-600 underline hover:text-brand-500 font-semibold"
                  >
                    Change
                  </button>
                </div>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Input organization authorization details. Client-side sandbox mock authentication is active.
              </p>
            </div>

            <div className="space-y-3.5 pt-2">
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Operator Identity / Email
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    value={credentials.email}
                    onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                    required
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600 font-mono"
                    placeholder="operator@organization.gov"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Security Token / Passphrase
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type="password"
                    value={credentials.password}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                    required
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600 font-mono"
                    placeholder="Enter security token"
                  />
                </div>
              </div>

              {/* Agency / IMO Identifier */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Agency Code / IMO Fleet Identifier
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={credentials.agency}
                    onChange={(e) => setCredentials({ ...credentials, agency: e.target.value })}
                    required
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600 font-mono"
                    placeholder="e.g. IT-CG-FORENSIC-04 or IMO-918234"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handlePrevStep}
                className="flex items-center space-x-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center space-x-2 rounded-lg bg-brand-600 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-brand-500 active:bg-brand-700 disabled:opacity-60 cursor-pointer shadow-sm"
              >
                <KeyRound className="h-4 w-4" />
                <span>{isSubmitting ? 'Authenticating...' : 'Authenticate & Enter Portal'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
