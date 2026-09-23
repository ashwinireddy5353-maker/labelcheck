import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Logo } from '../../components/ui/Logo';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Eye, EyeOff, UserPlus, Lock, Mail, User as UserIcon, Check } from 'lucide-react';

const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    agreeToTerms: z.boolean().refine((val) => val === true, 'You must agree to the Terms of Service'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export const RegisterPage: React.FC = () => {
  const { register: registerAuth } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const passwordValue = watch('password', '');

  const calculatePasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'None', color: 'bg-slate-200' };
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 1) return { score: 25, label: 'Weak', color: 'bg-red-500' };
    if (score === 2 || score === 3) return { score: 65, label: 'Medium', color: 'bg-amber-500' };
    return { score: 100, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = calculatePasswordStrength(passwordValue);

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      await registerAuth({
        fullName: data.fullName,
        email: data.email,
        password: data.password,
      });
      showToast('Account created successfully!', 'success');
      navigate('/onboarding');
    } catch (err: any) {
      showToast(err.message || 'Registration failed. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-3xl border border-slate-200 shadow-xl">
        <div className="text-center space-y-3">
          <Logo size="lg" className="justify-center" />
          <h2 className="text-2xl font-extrabold text-slate-900">Create LabelCheck Account</h2>
          <p className="text-xs text-slate-500">
            Set up your profile to customize AI ingredient allergy screening.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Full Name"
            placeholder="Alex Morgan"
            leftIcon={<UserIcon className="w-4 h-4" />}
            error={errors.fullName?.message}
            {...register('fullName')}
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            leftIcon={<Mail className="w-4 h-4" />}
            error={errors.email?.message}
            {...register('email')}
          />

          <div className="space-y-1.5">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Min 8 characters"
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

            {/* Password Strength Indicator */}
            {passwordValue && (
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                  <span>Password strength:</span>
                  <span className={strength.score === 100 ? 'text-emerald-600' : 'text-slate-600'}>
                    {strength.label}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${strength.color} transition-all duration-300`}
                    style={{ width: `${strength.score}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <Input
            label="Confirm Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Re-enter password"
            leftIcon={<Lock className="w-4 h-4" />}
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          <div className="pt-2">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600">
              <input
                type="checkbox"
                className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                {...register('agreeToTerms')}
              />
              <span className="leading-snug">
                I agree to the <a href="#" className="font-semibold text-teal-700 hover:underline">Terms of Service</a> and acknowledge the <a href="#" className="font-semibold text-teal-700 hover:underline">Non-Medical Disclaimer</a>.
              </span>
            </label>
            {errors.agreeToTerms && (
              <p className="text-xs text-red-600 font-medium mt-1">{errors.agreeToTerms.message}</p>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full mt-4"
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Create Account & Continue
          </Button>
        </form>

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-teal-700 hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};
