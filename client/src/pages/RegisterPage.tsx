import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  UserPlus, 
  Building2, 
  AlertCircle, 
  CheckCircle2, 
  Mail,
  User as UserIcon,
  Phone,
  Lock,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';

interface CollegeOption {
  _id: string;
  name: string;
  campusLocation: string;
  allowedEmailDomains: string[];
}

export const RegisterPage: React.FC = () => {
  const { register, verifyEmail } = useAuth();
  const navigate = useNavigate();

  const [colleges, setColleges] = useState<CollegeOption[]>([]);
  const [collegesLoading, setCollegesLoading] = useState(true);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('+91');
  const [selectedCollegeId, setSelectedCollegeId] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Demo Mode On-Screen Verification Banner State
  const [demoVerification, setDemoVerification] = useState<{
    url?: string;
    token?: string;
    message: string;
  } | null>(null);

  const [verifyingDemo, setVerifyingDemo] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);

  useEffect(() => {
    const fetchColleges = async () => {
      try {
        const res = await api.get('/colleges');
        if (res.data?.success && res.data.data?.colleges) {
          setColleges(res.data.data.colleges);
          if (res.data.data.colleges.length > 0) {
            setSelectedCollegeId(res.data.data.colleges[0]._id);
          }
        }
      } catch (err: any) {
        console.error('Failed to load colleges list:', err);
      } finally {
        setCollegesLoading(false);
      }
    };

    fetchColleges();
  }, []);

  const selectedCollege = colleges.find((c) => c._id === selectedCollegeId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setDemoVerification(null);

    if (!selectedCollegeId) {
      setErrorMsg('Please select your enrolled college');
      return;
    }

    setSubmitting(true);
    const result = await register({
      name,
      email,
      password,
      collegeId: selectedCollegeId,
      phone
    });
    setSubmitting(false);

    if (result.success) {
      if (result.rawToken || result.verificationUrl) {
        setDemoVerification({
          url: result.verificationUrl,
          token: result.rawToken,
          message: result.message
        });
      } else {
        alert(result.message);
        navigate('/login');
      }
    } else {
      setErrorMsg(result.message);
    }
  };

  const handleInstantDemoVerify = async () => {
    if (!demoVerification?.token) return;
    setVerifyingDemo(true);
    const res = await verifyEmail(demoVerification.token);
    setVerifyingDemo(false);

    if (res.success) {
      setVerificationSuccess(true);
    } else {
      setErrorMsg(res.message);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-dark/40 border border-brand-emerald/30 text-emerald-400 text-xs font-medium">
            <Building2 className="w-3.5 h-3.5" />
            <span>Institutional Student Onboarding</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Register Student Account
          </h1>
          <p className="text-muted text-sm">
            Join your campus circular economy. Only verified institutional emails allowed.
          </p>
        </div>

        {/* DEMO_MODE Verification Link Banner (When registration succeeds) */}
        {demoVerification && (
          <div className="bg-brand-dark/50 border border-brand-emerald rounded-2xl p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>Campus Email Verification Issued</span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed">
              {demoVerification.message} In accordance with <code className="text-emerald-300 font-mono">DEMO_MODE=true</code>, your account verification token is surfaced on screen for instant evaluation.
            </p>

            {verificationSuccess ? (
              <div className="bg-surface rounded-xl p-4 border border-brand-emerald/40 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Account Successfully Verified!</span>
                </div>
                <p className="text-xs text-slate-300">
                  Your campus identity has been verified. You may now sign in to post and request items.
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 w-full bg-brand-emerald text-slate-950 font-semibold py-2.5 rounded-xl hover:bg-emerald-400 text-sm transition-colors focus-ring"
                >
                  <span>Proceed to Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  type="button"
                  disabled={verifyingDemo}
                  onClick={handleInstantDemoVerify}
                  className="w-full bg-brand-emerald text-slate-950 font-semibold py-3 rounded-xl hover:bg-emerald-400 transition-colors text-sm flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 focus-ring"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{verifyingDemo ? 'Verifying Account...' : 'Click Here to Instantly Verify Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Registration Form Card */}
        {!verificationSuccess && (
          <div className="bg-surface border border-border-subtle rounded-2xl p-6 md:p-8 space-y-5 shadow-xl">
            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* College Selector */}
              <div className="space-y-1.5">
                <label htmlFor="reg-college" className="text-xs font-medium text-slate-300 flex items-center justify-between">
                  <span>Enrolled Campus</span>
                  <span className="text-[11px] text-emerald-400 font-mono">Domain Enforced</span>
                </label>
                <select
                  id="reg-college"
                  disabled={collegesLoading}
                  value={selectedCollegeId}
                  onChange={(e) => setSelectedCollegeId(e.target.value)}
                  className="w-full bg-surface-input border border-border-subtle focus:border-brand-emerald rounded-xl px-3.5 py-2.5 text-sm text-white outline-none transition-colors"
                >
                  {colleges.map((col) => (
                    <option key={col._id} value={col._id} className="bg-surface">
                      {col.name} ({col.campusLocation})
                    </option>
                  ))}
                </select>

                {selectedCollege && (
                  <p className="text-[11px] text-muted flex items-center gap-1 pt-0.5">
                    Authorized domain:{' '}
                    <span className="text-emerald-400 font-mono">
                      @{selectedCollege.allowedEmailDomains.join(', @')}
                    </span>
                  </p>
                )}
              </div>

              {/* Full Name */}
              <div className="space-y-1.5">
                <label htmlFor="reg-name" className="text-xs font-medium text-slate-300">
                  Full Student Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="reg-name"
                    type="text"
                    required
                    placeholder="e.g. Rahul Mehra"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-surface-input border border-border-subtle focus:border-brand-emerald rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Campus Email */}
              <div className="space-y-1.5">
                <label htmlFor="reg-email" className="text-xs font-medium text-slate-300">
                  Campus Institutional Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="reg-email"
                    type="email"
                    required
                    placeholder="student@iitb.ac.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-surface-input border border-border-subtle focus:border-brand-emerald rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-colors"
                  />
                </div>
                <p className="text-[11px] text-muted">
                  Gmail, Yahoo, and personal addresses are strictly rejected.
                </p>
              </div>

              {/* Indian Phone Number */}
              <div className="space-y-1.5">
                <label htmlFor="reg-phone" className="text-xs font-medium text-slate-300">
                  Mobile / WhatsApp (+91)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="reg-phone"
                    type="tel"
                    required
                    placeholder="+919819876543"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-surface-input border border-border-subtle focus:border-brand-emerald rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="reg-password" className="text-xs font-medium text-slate-300">
                  Password (min. 8 characters)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="reg-password"
                    type="password"
                    required
                    minLength={8}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-surface-input border border-border-subtle focus:border-brand-emerald rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-brand-emerald text-slate-950 font-semibold py-3 rounded-xl hover:bg-emerald-400 transition-colors text-sm flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 mt-2 focus-ring"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                    <span>Verifying Domain & Registering...</span>
                  </span>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Register Account</span>
                  </>
                )}
              </button>
            </form>

            <div className="text-center pt-2 border-t border-border-subtle text-xs text-muted">
              Already registered?{' '}
              <Link to="/login" className="text-emerald-400 hover:underline font-medium">
                Sign in here
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
