import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Logo } from '../../components/ui/Logo';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Eye, EyeOff, LogIn, Lock, Mail, ShieldCheck } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'alex.morgan@example.com',
      password: 'Password123!',
      rememberMe: true,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      showToast('Successfully logged in!', 'success');
      navigate(from, { replace: true });
    } catch (err: any) {
      showToast(err.message || 'Failed to login. Please check credentials.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoAdminLogin = () => {
    setValue('email', 'admin.vance@labelcheck.org');
    setValue('password', 'AdminSecret123!');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-3xl border border-slate-200 shadow-xl">
        <div className="text-center space-y-3">
          <Logo size="lg" className="justify-center" />
          <h2 className="text-2xl font-extrabold text-slate-900">Sign in to LabelCheck</h2>
          <p className="text-xs text-slate-500">
            Enter your credentials to access your personalized ingredient safety dashboard.
          </p>
        </div>

        {/* Demo Fast Login Preset Bar */}
        <div className="p-3 bg-teal-50 border border-teal-200 rounded-2xl flex items-center justify-between text-xs">
          <span className="font-semibold text-teal-900">College Demo Quick Login:</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setValue('email', 'alex.morgan@example.com');
                setValue('password', 'Password123!');
              }}
              className="px-2 py-1 bg-teal-700 text-white rounded-lg font-bold hover:bg-teal-800 text-[11px]"
            >
              User Demo
            </button>
            <button
              type="button"
              onClick={handleDemoAdminLogin}
              className="px-2 py-1 bg-amber-700 text-white rounded-lg font-bold hover:bg-amber-800 text-[11px] flex items-center gap-1"
            >
              <ShieldCheck className="w-3 h-3" />
              Admin Demo
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            leftIcon={<Mail className="w-4 h-4" />}
            error={errors.email?.message}
            {...register('email')}
          />

          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="focus:outline-none hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              error={errors.password?.message}
              {...register('password')}
            />
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-slate-600">
              <input
                type="checkbox"
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                {...register('rememberMe')}
              />
              <span>Remember this device</span>
            </label>

            <Link to="/forgot-password" className="font-semibold text-teal-700 hover:underline">
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full mt-2"
            leftIcon={<LogIn className="w-4 h-4" />}
          >
            Sign In
          </Button>

          {/* Social Google Login Mock */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400 font-semibold">Or continue with</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="md"
            className="w-full text-slate-700 font-semibold"
            onClick={() => showToast('Google OAuth placeholder integration', 'info')}
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Sign in with Google
          </Button>
        </form>

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          Don't have a LabelCheck account?{' '}
          <Link to="/register" className="font-bold text-teal-700 hover:underline">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
};
