import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../../components/ui/Logo';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-3xl border border-slate-200 shadow-xl">
        <div className="text-center space-y-3">
          <Logo size="lg" className="justify-center" />
          <h2 className="text-2xl font-extrabold text-slate-900">Reset Your Password</h2>
          <p className="text-xs text-slate-500">
            Enter your registered email address and we’ll send a password recovery link.
          </p>
        </div>

        {isSubmitted ? (
          <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-emerald-900">Reset Link Sent!</h4>
            <p className="text-xs text-emerald-800 leading-relaxed">
              We sent password reset instructions to <span className="font-bold">{email}</span>. Please check your inbox and spam folder.
            </p>
            <Link to="/login">
              <Button variant="outline" size="sm" className="w-full mt-2" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Back to Sign In
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              leftIcon={<Mail className="w-4 h-4" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full mt-2"
            >
              Send Reset Link
            </Button>
          </form>
        )}

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          Remembered your password?{' '}
          <Link to="/login" className="font-bold text-teal-700 hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
};
