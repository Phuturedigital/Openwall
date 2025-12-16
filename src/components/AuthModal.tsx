import { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type AuthModalProps = {
  onClose: () => void;
};

export function AuthModal({ onClose }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn, signUp, resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'reset') {
        const { error } = await resetPassword(email);
        if (error) throw error;
        setSuccess('Password reset link sent! Check your email.');
        setTimeout(() => setMode('signin'), 3000);
      } else if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) throw error;
        onClose();
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) throw error;
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
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
        className="bg-white rounded-2xl max-w-md w-full p-8 relative shadow-2xl"
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-3xl font-semibold mb-6 text-gray-900">
          {mode === 'signin' ? 'Sign In' : mode === 'reset' ? 'Reset Password' : 'Create Account'}
        </h2>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm"
          >
            {error}
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm"
          >
            {success}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 border border-stripe-border rounded-xl focus:outline-none focus:ring-2 focus:ring-stripe-primary/20 focus:border-stripe-primary transition-all"
                  required
                />
              </div>
            </motion.div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-stripe-border rounded-xl focus:outline-none focus:ring-2 focus:ring-stripe-primary/20 focus:border-stripe-primary transition-all"
              required
            />
          </div>

          {mode !== 'reset' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-stripe-border rounded-xl focus:outline-none focus:ring-2 focus:ring-stripe-primary/20 focus:border-stripe-primary transition-all"
                required
                minLength={6}
              />
            </div>
          )}

          {mode === 'signup' && (
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              By creating an account, you agree to the{' '}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  const event = new CustomEvent('openTerms');
                  window.dispatchEvent(event);
                }}
                className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Terms & Conditions
              </button>
              {' and '}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  const event = new CustomEvent('openTerms');
                  window.dispatchEvent(event);
                }}
                className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Privacy Policy
              </button>
              .
            </p>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full bg-stripe-primary text-white py-3.5 px-4 rounded-xl hover:bg-stripe-hover disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg shadow-stripe-primary/20 transition-all"
          >
            {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : mode === 'reset' ? 'Send Reset Link' : 'Sign Up'}
          </motion.button>
        </form>

        <div className="mt-6 text-center text-sm space-y-2">
          {mode === 'signin' && (
            <>
              <button
                onClick={() => setMode('reset')}
                className="text-gray-600 hover:text-stripe-primary font-medium block w-full"
              >
                Forgot password?
              </button>
              <p className="text-gray-600">
                Don't have an account?{' '}
                <button
                  onClick={() => setMode('signup')}
                  className="text-stripe-primary hover:text-stripe-hover font-semibold"
                >
                  Sign up
                </button>
              </p>
            </>
          )}
          {mode === 'signup' && (
            <p className="text-gray-600">
              Already have an account?{' '}
              <button
                onClick={() => setMode('signin')}
                className="text-stripe-primary hover:text-stripe-hover font-semibold"
              >
                Sign in
              </button>
            </p>
          )}
          {mode === 'reset' && (
            <p className="text-gray-600">
              Remember your password?{' '}
              <button
                onClick={() => setMode('signin')}
                className="text-stripe-primary hover:text-stripe-hover font-semibold"
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
    </motion.div>
  );
}
