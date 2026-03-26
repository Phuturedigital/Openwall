import { motion, AnimatePresence } from 'framer-motion';
import {
  X, MapPin, Shield, Check, Globe, Instagram, Linkedin,
  Briefcase, ArrowLeft, Clock,
} from 'lucide-react';
import { ConnectionRequest, Profile } from '../lib/supabase';

type RequesterProfileModalProps = {
  request: ConnectionRequest;
  onClose: () => void;
  onApprove: (requestId: string) => void;
  onDecline: (requestId: string) => void;
};

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatTime(date: string): string {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function cleanUrl(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
}

function ensureHttps(url: string): string {
  if (!url) return url;
  return url.startsWith('http') ? url : `https://${url}`;
}

export function RequesterProfileModal({
  request,
  onClose,
  onApprove,
  onDecline,
}: RequesterProfileModalProps) {
  const requester = request.profiles as Profile;
  const note = request.notes;
  const isPending = request.status === 'pending';
  const name = requester?.full_name || 'Anonymous';
  const initials = getInitials(name);

  const hasSocialLinks = requester?.instagram_url || requester?.linkedin_url || requester?.website_url;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-[#111] w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden border border-gray-100 dark:border-[#222]"
        >
          {/* Header */}
          <div className="flex-shrink-0 flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 dark:border-[#1e1e1e]">
            <button
              onClick={onClose}
              className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to requests
            </button>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              request.status === 'pending'
                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                : request.status === 'approved'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
            }`}>
              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
            </span>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto">
            {/* Identity section */}
            <div className="px-6 pt-6 pb-5">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-16 h-16 rounded-2xl bg-gray-900 dark:bg-white flex items-center justify-center flex-shrink-0">
                  <span className="text-xl font-bold text-white dark:text-gray-900">{initials}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{name}</h2>
                    {requester?.verified && (
                      <Shield className="w-4 h-4 text-green-500 flex-shrink-0" aria-label="Verified" />
                    )}
                  </div>
                  {requester?.profession && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{requester.profession}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                    {requester?.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {requester.city}
                      </span>
                    )}
                    {requester?.experience && <span>{requester.experience}</span>}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Requested {formatTime(request.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bio */}
            {requester?.bio && (
              <div className="px-6 pb-5">
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {requester.bio}
                </p>
              </div>
            )}

            {/* Services offered */}
            {requester?.services_offered && requester.services_offered.length > 0 && (
              <div className="px-6 pb-5">
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                    Services
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {requester.services_offered.map((service) => (
                    <span
                      key={service}
                      className="px-3 py-1.5 bg-gray-100 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] text-gray-700 dark:text-gray-300 rounded-full text-xs font-medium"
                    >
                      {service}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Skills */}
            {requester?.skills && requester.skills.length > 0 && (
              <div className="px-6 pb-5">
                <div className="flex flex-wrap gap-2">
                  {requester.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Social / web links */}
            {hasSocialLinks && (
              <div className="px-6 pb-5">
                <span className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 block mb-3">
                  Links
                </span>
                <div className="space-y-2">
                  {requester.instagram_url && (
                    <a
                      href={ensureHttps(requester.instagram_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-xl hover:bg-gray-100 dark:hover:bg-[#222] transition-colors group"
                    >
                      <Instagram className="w-4 h-4 text-pink-500 flex-shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white truncate">
                        {cleanUrl(requester.instagram_url)}
                      </span>
                    </a>
                  )}
                  {requester.linkedin_url && (
                    <a
                      href={ensureHttps(requester.linkedin_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-xl hover:bg-gray-100 dark:hover:bg-[#222] transition-colors group"
                    >
                      <Linkedin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white truncate">
                        {cleanUrl(requester.linkedin_url)}
                      </span>
                    </a>
                  )}
                  {requester.website_url && (
                    <a
                      href={ensureHttps(requester.website_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-xl hover:bg-gray-100 dark:hover:bg-[#222] transition-colors group"
                    >
                      <Globe className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white truncate">
                        {cleanUrl(requester.website_url)}
                      </span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Requesting unlock for note */}
            {note && (
              <div className="mx-6 mb-6 p-4 bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-2xl">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">
                  Requesting access to your note
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed line-clamp-3">
                  {note.body}
                </p>
                {note.budget && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Budget: <span className="font-semibold text-gray-700 dark:text-gray-300">R{(note.budget / 100).toFixed(0)}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Sticky footer — action buttons */}
          <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 dark:border-[#1e1e1e] bg-white dark:bg-[#111]">
            {isPending ? (
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { onApprove(request.id); onClose(); }}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-semibold text-sm hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Approve Request
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { onDecline(request.id); onClose(); }}
                  className="flex items-center justify-center gap-2 px-6 py-3.5 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-2xl font-semibold text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  Decline
                </motion.button>
              </div>
            ) : (
              <div className="text-center py-1">
                <span className={`text-sm font-medium ${
                  request.status === 'approved'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-500 dark:text-red-400'
                }`}>
                  {request.status === 'approved'
                    ? '✓ You approved this request'
                    : '✗ You declined this request'}
                </span>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
