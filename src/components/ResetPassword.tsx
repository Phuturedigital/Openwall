import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Check, AlertCircle, CheckCircle } from 'lucide-react';
import { LoadingLogo } from './LoadingLogo';
import { supabase } from '../lib/supabase';
import { logUserActivity, ActivityActions } from '../lib/activityLogger';
import {
  validatePassword,
  validatePasswordMatch,
  getPasswordStrength,
} from '../lib/validation';

export function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const [touched, setTouched] = useState({
    password: false,
    confirmPassword: false,
  });

  useEffect(() => {
    if (!touched.password) return;
    const result = validatePassword(password);
    setPasswordError(result.error || '');
  }, [password, touched.password]);

  useEffect(() => {
    if (!touched.confirmPassword) return;
    const result = validatePasswordMatch(password, confirmPassword);
    setConfirmPasswordError(result.error || '');
  }, [password, confirmPassword, touched.confirmPassword]);

  const passwordStrength = password ? getPasswordStrength(password) : null;

  const isFormValid = () => {
    return (
      validatePassword(password).isValid &&
      validatePasswordMatch(password, confirmPassword).isValid
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    setTouched({
      password: true,
      confirmPassword: true,
    });

    if (!isFormValid()) {
      return;
    }

    setLoading(true);

    try {
      const { data, error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) throw updateError;

      if (data.user) {
        await logUserActivity(data.user.id, ActivityActions.PASSWORD_RESET_COMPLETED);
      }

      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred';
      if (errorMessage.includes('same password')) {
        setError('Please choose a different password.');
      } else {
        setError('Reset link invalid or expired. Request a new one.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
          </motion.div>

          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Password Updated!
          </h1>

          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Your password has been successfully updated. Please log in with your new password.
          </p>

          <div className="text-sm text-gray-500 dark:text-gray-500">
            Redirecting to login...
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full"
      >
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Reset Password
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Enter your new password below
        </p>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched({ ...touched, password: true })}
                className={`w-full px-4 py-3 pr-12 border ${
                  passwordError
                    ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                    : password && !passwordError
                    ? 'border-green-300 focus:ring-green-500/20 focus:border-green-500'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500/20 focus:border-blue-500'
                } dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 transition-all`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {passwordError && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{passwordError}</p>
            )}
            {password && !passwordError && passwordStrength && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                  <span>Password strength</span>
                  <span className="capitalize">{passwordStrength.strength}</span>
                </div>
                <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: passwordStrength.width }}
                    className={`h-full ${passwordStrength.color} transition-all duration-300`}
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => setTouched({ ...touched, confirmPassword: true })}
                className={`w-full px-4 py-3 pr-12 border ${
                  confirmPasswordError
                    ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                    : confirmPassword && !confirmPasswordError
                    ? 'border-green-300 focus:ring-green-500/20 focus:border-green-500'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500/20 focus:border-blue-500'
                } dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 transition-all`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
              {confirmPassword && !confirmPasswordError && (
                <Check className="absolute right-11 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
              )}
            </div>
            {confirmPasswordError && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {confirmPasswordError}
              </p>
            )}
          </div>

          <motion.button
            whileHover={{ scale: isFormValid() && !loading ? 1.02 : 1 }}
            whileTap={{ scale: isFormValid() && !loading ? 0.98 : 1 }}
            type="submit"
            disabled={!isFormValid() || loading}
            className={`w-full py-3.5 px-4 rounded-xl font-semibold shadow-lg transition-all cursor-pointer ${
              isFormValid() && !loading
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20 hover:shadow-blue-600/30'
                : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }`}
            aria-label="Update password"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingLogo className="w-5 h-5" />
                Updating password...
              </span>
            ) : (
              'Update Password'
            )}
          </motion.button>
        </form>

        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors cursor-pointer"
          >
            Back to Openwall
          </a>
        </div>
      </motion.div>
    </div>
  );
}
