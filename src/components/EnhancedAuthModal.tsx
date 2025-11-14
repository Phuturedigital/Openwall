import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import { LoadingLogo } from './LoadingLogo';
import { useAuth } from '../contexts/AuthContext';
import {
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  validateName,
  getPasswordStrength,
} from '../lib/validation';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5">
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
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

type AuthMode = 'signin' | 'signup' | 'reset';

type AuthModalProps = {
  onClose: () => void;
};

export function EnhancedAuthModal({ onClose }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [nameError, setNameError] = useState('');
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [touched, setTouched] = useState({
    email: false,
    password: false,
    confirmPassword: false,
    name: false,
  });

  const { signIn, signUp, resetPassword, signInWithGoogle } = useAuth();

  useEffect(() => {
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setNameError('');
    setFormError('');
    setSuccessMessage('');
    setTouched({ email: false, password: false, confirmPassword: false, name: false });
  }, [mode]);

  const validateEmailField = () => {
    if (!touched.email) return;
    const result = validateEmail(email);
    setEmailError(result.error || '');
  };

  const validatePasswordField = () => {
    if (!touched.password) return;
    const result = validatePassword(password);
    setPasswordError(result.error || '');
  };

  const validateConfirmPasswordField = () => {
    if (!touched.confirmPassword) return;
    const result = validatePasswordMatch(password, confirmPassword);
    setConfirmPasswordError(result.error || '');
  };

  const validateNameField = () => {
    if (!touched.name) return;
    const result = validateName(fullName);
    setNameError(result.error || '');
  };

  useEffect(() => {
    validateEmailField();
  }, [email, touched.email]);

  useEffect(() => {
    validatePasswordField();
  }, [password, touched.password]);

  useEffect(() => {
    validateConfirmPasswordField();
  }, [password, confirmPassword, touched.confirmPassword]);

  useEffect(() => {
    validateNameField();
  }, [fullName, touched.name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccessMessage('');

    setTouched({
      email: true,
      password: mode !== 'reset',
      confirmPassword: mode === 'signup',
      name: mode === 'signup',
    });

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error || '');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    if (mode === 'signup') {
      const nameValidation = validateName(fullName);
      if (!nameValidation.isValid) {
        setNameError(nameValidation.error || '');
        setShake(true);
        setTimeout(() => setShake(false), 500);
        return;
      }

      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        setPasswordError(passwordValidation.error || '');
        setShake(true);
        setTimeout(() => setShake(false), 500);
        return;
      }

      const matchValidation = validatePasswordMatch(password, confirmPassword);
      if (!matchValidation.isValid) {
        setConfirmPasswordError(matchValidation.error || '');
        setShake(true);
        setTimeout(() => setShake(false), 500);
        return;
      }
    }

    if (mode === 'signin') {
      if (!password) {
        setPasswordError('Password is required');
        setShake(true);
        setTimeout(() => setShake(false), 500);
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'reset') {
        const { error } = await resetPassword(email);
        if (error) throw error;
        setSuccessMessage(
          "If that email exists, we've sent password reset instructions. Please check your inbox."
        );
        setTimeout(() => {
          setMode('signin');
          setSuccessMessage('');
        }, 5000);
      } else if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) throw error;
        onClose();
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) throw error;
        setSuccessMessage(
          "We've sent you a confirmation link. Please verify your email to continue."
        );
        setTimeout(() => {
          onClose();
        }, 3000);
      }
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred. Please try again.';
      if (errorMessage.includes('Invalid login credentials') || errorMessage.includes('Invalid')) {
        setFormError('Invalid email or password. Please try again.');
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        setFormError('Network issue. Please check your connection and try again.');
      } else {
        setFormError(errorMessage);
      }
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleSubmit(e as any);
    }
  };

  const passwordStrength = mode === 'signup' ? getPasswordStrength(password) : null;

  const isFormValid = () => {
    if (mode === 'reset') {
      return validateEmail(email).isValid;
    }
    if (mode === 'signin') {
      return validateEmail(email).isValid && password.length > 0;
    }
    if (mode === 'signup') {
      return (
        validateEmail(email).isValid &&
        validatePassword(password).isValid &&
        validatePasswordMatch(password, confirmPassword).isValid &&
        validateName(fullName).isValid
      );
    }
    return false;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className={`bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-8 relative shadow-2xl ${
          shake ? 'animate-shake' : ''
        }`}
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-3xl font-semibold mb-6 text-gray-900 dark:text-white">
          {mode === 'signin' ? 'Sign In' : mode === 'reset' ? 'Reset Password' : 'Create Account'}
        </h2>

        <AnimatePresence mode="wait">
          {formError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{formError}</span>
            </motion.div>
          )}

          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl text-sm flex items-start gap-2"
            >
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{successMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Full Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onBlur={() => setTouched({ ...touched, name: true })}
                  className={`w-full px-4 py-3 border ${
                    nameError
                      ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                      : fullName && !nameError
                      ? 'border-green-300 focus:ring-green-500/20 focus:border-green-500'
                      : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500/20 focus:border-blue-500'
                  } dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 transition-all`}
                  placeholder="John Doe"
                />
                {fullName && !nameError && (
                  <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                )}
              </div>
              {nameError && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{nameError}</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched({ ...touched, email: true })}
                className={`w-full px-4 py-3 border ${
                  emailError
                    ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                    : email && !emailError
                    ? 'border-green-300 focus:ring-green-500/20 focus:border-green-500'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500/20 focus:border-blue-500'
                } dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 transition-all`}
                placeholder="you@example.com"
              />
              {email && !emailError && (
                <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
              )}
            </div>
            {emailError && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{emailError}</p>
            )}
          </div>

          {mode !== 'reset' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
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
                      : password && !passwordError && mode === 'signup'
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
              {mode === 'signup' && password && !passwordError && passwordStrength && (
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
          )}

          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirm Password
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
          )}

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
            aria-label={
              mode === 'signin' ? 'Sign in' : mode === 'reset' ? 'Send reset link' : 'Sign up'
            }
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingLogo className="w-5 h-5" />
                Please wait...
              </span>
            ) : mode === 'signin' ? (
              'Sign In'
            ) : mode === 'reset' ? (
              'Send Reset Link'
            ) : (
              'Create Account'
            )}
          </motion.button>
        </form>

        {mode !== 'reset' && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  Or continue with
                </span>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={async () => {
                try {
                  const { error } = await signInWithGoogle();
                  if (error) {
                    setFormError(error.message);
                    setShake(true);
                    setTimeout(() => setShake(false), 500);
                  }
                } catch (err: any) {
                  setFormError(err.message || 'Failed to sign in with Google');
                  setShake(true);
                  setTimeout(() => setShake(false), 500);
                }
              }}
              type="button"
              className="w-full py-3.5 px-4 rounded-xl font-semibold shadow-lg transition-all cursor-pointer bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center justify-center gap-3"
              aria-label="Sign in with Google"
            >
              <GoogleIcon />
              <span>Sign in with Google</span>
            </motion.button>
          </>
        )}

        <div className="mt-6 text-center text-sm space-y-2">
          {mode === 'signin' && (
            <>
              <button
                onClick={() => {
                  onClose();
                  window.history.pushState({}, '', '/forgot-password');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium block w-full hover:underline transition-colors cursor-pointer"
              >
                Forgot password?
              </button>
              <p className="text-gray-600 dark:text-gray-400">
                Don't have an account?{' '}
                <button
                  onClick={() => setMode('signup')}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold hover:underline transition-colors cursor-pointer"
                >
                  Sign up
                </button>
              </p>
            </>
          )}
          {mode === 'signup' && (
            <p className="text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <button
                onClick={() => setMode('signin')}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold hover:underline transition-colors cursor-pointer"
              >
                Sign in
              </button>
            </p>
          )}
          {mode === 'reset' && (
            <p className="text-gray-600 dark:text-gray-400">
              Remember your password?{' '}
              <button
                onClick={() => setMode('signin')}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold hover:underline transition-colors cursor-pointer"
              >
                Sign in
              </button>
            </p>
          )}

          <p className="text-center text-[10px] text-gray-400 dark:text-gray-500 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
            Powered by{' '}
            <a
              href="https://www.phuturedigital.co.za"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
            >
              Phuture Digital
            </a>
          </p>
        </div>
      </motion.div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
          20%, 40%, 60%, 80% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.5s;
        }
      `}</style>
    </motion.div>
  );
}
