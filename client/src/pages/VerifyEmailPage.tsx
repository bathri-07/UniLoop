import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { verifyEmail } = useAuth();

  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const runVerification = async () => {
      if (!token) {
        setVerifying(false);
        setSuccess(false);
        setMessage('Missing email verification token in link.');
        return;
      }

      const res = await verifyEmail(token);
      setVerifying(false);
      setSuccess(res.success);
      setMessage(res.message);
    };

    runVerification();
  }, [token]);

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-surface border border-border-subtle rounded-2xl p-8 text-center space-y-6 shadow-xl">
        <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center bg-surface-elevated border border-border-subtle">
          {verifying ? (
            <span className="w-5 h-5 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
          ) : success ? (
            <CheckCircle2 className="w-6 h-6 text-brand-emerald" />
          ) : (
            <AlertCircle className="w-6 h-6 text-red-400" />
          )}
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {verifying
              ? 'Verifying Campus Email...'
              : success
              ? 'Email Verified Successfully!'
              : 'Verification Failed'}
          </h1>
          <p className="text-sm text-slate-300">
            {message || 'Validating your institutional token against the campus security registry.'}
          </p>
        </div>

        {!verifying && (
          <div className="pt-2">
            <Link
              to="/login"
              className="w-full bg-brand-emerald text-slate-950 font-semibold py-3 rounded-xl hover:bg-emerald-400 transition-colors text-sm flex items-center justify-center gap-2 focus-ring shadow-sm"
            >
              <span>Proceed to Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
