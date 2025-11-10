import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Shield, User, Mail, Eye, EyeOff, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { logUserActivity, ActivityActions } from '../lib/activityLogger';

export function SettingsView() {
  const { profile } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState(false);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!/\d/.test(password)) {
      return 'Password must contain at least one number';
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return 'Password must contain at least one special character';
    }
    return null;
  };

  const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
    if (password.length === 0) return { strength: 0, label: '', color: '' };

    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;

    if (strength <= 2) return { strength: 25, label: 'Weak', color: 'bg-red-500' };
    if (strength === 3) return { strength: 50, label: 'Fair', color: 'bg-orange-500' };
    if (strength === 4) return { strength: 75, label: 'Good', color: 'bg-yellow-500' };
    return { strength: 100, label: 'Strong', color: 'bg-green-500' };
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    const validationError = validatePassword(newPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setSaving(true);

    try {
      const { data, error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }

      if (data.user) {
        await logUserActivity(data.user.id, ActivityActions.PASSWORD_CHANGED);
      }

      setSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setEmailSuccess(false);

    if (!newEmail || newEmail === profile?.email) {
      setEmailError('Please enter a different email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setSavingEmail(true);

    try {
      const { data, error: updateError } = await supabase.auth.updateUser({
        email: newEmail,
      });

      if (updateError) {
        setEmailError(updateError.message);
        setSavingEmail(false);
        return;
      }

      if (data.user) {
        await logUserActivity(data.user.id, ActivityActions.EMAIL_CHANGE_REQUESTED);
      }

      setEmailSuccess(true);
      setNewEmail('');
      setTimeout(() => setEmailSuccess(false), 10000);
    } catch (err) {
      setEmailError('An unexpected error occurred');
    } finally {
      setSavingEmail(false);
    }
  };

  const passwordStrength = getPasswordStrength(newPassword);

  if (!profile) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Please sign in to access settings</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your account security and preferences</p>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 shadow-sm">
            <div className="flex items-center gap-4 pb-6 border-b border-gray-200 dark:border-gray-700">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{profile.full_name || 'User'}</h2>
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Mail className="w-4 h-4" />
                  <span>{profile.email}</span>
                </div>
                {profile.verified && (
                  <div className="flex items-center gap-1 mt-1">
                    <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm text-green-600 dark:text-green-400 font-medium">Verified Account</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <Mail className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Change Email Address</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Update your email address</p>
              </div>
            </div>

            <form onSubmit={handleEmailChange} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current Email
                </label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  New Email Address
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer"
                  placeholder="newemail@example.com"
                  required
                />
              </div>

              <AnimatePresence>
                {emailError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm"
                  >
                    {emailError}
                  </motion.div>
                )}

                {emailSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4 bg-blue-100 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-blue-700 dark:text-blue-300 text-sm"
                  >
                    <div className="flex items-start gap-2">
                      <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold mb-1">Verification email sent!</p>
                        <p>Check your inbox at <strong>{newEmail || 'your new email'}</strong> and click the confirmation link to complete the email change.</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={savingEmail || emailSuccess || !newEmail}
                className="w-full py-3 bg-purple-600 text-white rounded-xl font-semibold shadow-lg shadow-purple-600/20 hover:shadow-purple-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                aria-label="Update email address"
              >
                {savingEmail ? 'Sending Verification...' : emailSuccess ? 'Verification Sent!' : 'Update Email Address'}
              </motion.button>
            </form>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <Lock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Change Password</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Update your password to keep your account secure</p>
              </div>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer"
                    placeholder="Enter new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4 text-gray-500" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                </div>

                {newPassword && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        Password Strength: <span className={`${passwordStrength.color.replace('bg-', 'text-')}`}>{passwordStrength.label}</span>
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${passwordStrength.strength}%` }}
                        className={`h-full ${passwordStrength.color} transition-all`}
                      />
                    </div>
                  </div>
                )}

                <div className="mt-3 space-y-2">
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Password requirements:</p>
                  <div className="space-y-1">
                    <div className={`flex items-center gap-2 text-xs ${newPassword.length >= 8 ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      <Check className={`w-3 h-3 ${newPassword.length >= 8 ? 'opacity-100' : 'opacity-30'}`} />
                      <span>At least 8 characters</span>
                    </div>
                    <div className={`flex items-center gap-2 text-xs ${/\d/.test(newPassword) ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      <Check className={`w-3 h-3 ${/\d/.test(newPassword) ? 'opacity-100' : 'opacity-30'}`} />
                      <span>Contains at least one number</span>
                    </div>
                    <div className={`flex items-center gap-2 text-xs ${/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      <Check className={`w-3 h-3 ${/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? 'opacity-100' : 'opacity-30'}`} />
                      <span>Contains at least one special character</span>
                    </div>
                  </div>
                </div>
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
                    className="w-full px-4 py-3 pr-12 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer"
                    placeholder="Confirm new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4 text-gray-500" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                </div>

                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="mt-2 text-xs text-red-600 dark:text-red-400">Passwords do not match</p>
                )}
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4 bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-300 text-sm flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Password updated successfully!
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={saving || success || !newPassword || !confirmPassword}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                aria-label="Update password"
              >
                {saving ? 'Updating Password...' : success ? 'Password Updated!' : 'Update Password'}
              </motion.button>
            </form>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Security Tips</h4>
                <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  <li>• Use a unique password that you don't use anywhere else</li>
                  <li>• Consider using a password manager to generate and store strong passwords</li>
                  <li>• Change your password regularly to maintain account security</li>
                  <li>• Never share your password with anyone</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
