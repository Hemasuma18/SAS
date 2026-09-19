import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [loginMode, setLoginMode] = useState('email'); // 'email' | 'roll'
  const { register, handleSubmit, formState: { errors }, reset } = useForm();

  const onSubmit = async (data) => {
    const payload =
      loginMode === 'roll'
        ? { rollNumber: data.rollNumber, password: data.password }
        : { email: data.email, password: data.password };

    const result = await login(payload);
    if (result.success) {
      toast.success('Welcome back!');
      navigate('/');
    } else {
      toast.error(result.message);
    }
  };

  const switchMode = (mode) => { setLoginMode(mode); reset(); };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <ClipboardDocumentCheckIcon className="w-9 h-9 text-purple-700" />
          </div>
          <h1 className="text-3xl font-bold text-white">AttendEase</h1>
          <p className="text-purple-300 mt-1">Smart Attendance Management</p>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Sign in to your account</h2>

          {/* Mode toggle */}
          <div className="flex rounded-lg border border-gray-200 p-1 mb-5 bg-gray-50">
            <button
              type="button"
              onClick={() => switchMode('email')}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${loginMode === 'email' ? 'bg-white shadow text-purple-700' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Faculty / Admin
            </button>
            <button
              type="button"
              onClick={() => switchMode('roll')}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${loginMode === 'roll' ? 'bg-white shadow text-purple-700' : 'text-gray-500 hover:text-gray-700'}`}
            >
              CR Login
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {loginMode === 'email' ? (
              <div className="form-group">
                <label className="label">Email Address</label>
                <input
                  type="email"
                  className="input"
                  placeholder="faculty@college.edu"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' },
                  })}
                />
                {errors.email && <p className="error-text">{errors.email.message}</p>}
              </div>
            ) : (
              <div className="form-group">
                <label className="label">Roll Number</label>
                <input
                  className="input"
                  placeholder="e.g. 23K61A0606"
                  {...register('rollNumber', { required: 'Roll number is required' })}
                />
                {errors.rollNumber && <p className="error-text">{errors.rollNumber.message}</p>}
              </div>
            )}

            <div className="form-group">
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                {...register('password', { required: 'Password is required' })}
              />
              {errors.password && <p className="error-text">{errors.password.message}</p>}
            </div>

            <button type="submit" className="btn-primary w-full justify-center py-2.5 mt-2" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-5 p-3 bg-purple-50 rounded-lg space-y-1">
            <p className="text-xs text-purple-700 font-medium">Demo Credentials</p>
            <p className="text-xs text-gray-600">Admin — admin@college.edu / Admin@123</p>
            <p className="text-xs text-gray-600">Faculty — saravana.kumar@college.edu / Faculty@123</p>
            <p className="text-xs text-gray-600">CR — Roll: 23K61A0606 / CR@0606</p>
          </div>
        </div>
      </div>
    </div>
  );
}
