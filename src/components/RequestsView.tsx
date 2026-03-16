import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Clock, Shield, MapPin } from 'lucide-react';
import { supabase, ConnectionRequest } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { LoadingLogo } from './LoadingLogo';
import { RequestsListSkeleton } from './LoadingSkeleton';

type Tab = 'received' | 'sent';

export function RequestsView() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('received');
  const [receivedRequests, setReceivedRequests] = useState<ConnectionRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      loadRequests();
    }
  }, [profile]);

  async function loadRequests() {
    if (!profile) return;

    setLoading(true);

    const { data: received } = await supabase
      .from('connection_requests')
      .select('*, notes(*, profiles!notes_user_id_fkey(*)), profiles!connection_requests_freelancer_id_fkey(*)')
      .eq('notes.user_id', profile.id)
      .order('created_at', { ascending: false });

    const { data: sent } = await supabase
      .from('connection_requests')
      .select('*, notes(*, profiles!notes_user_id_fkey(*)), profiles!connection_requests_freelancer_id_fkey(*)')
      .eq('freelancer_id', profile.id)
      .order('created_at', { ascending: false });

    setReceivedRequests(received || []);
    setSentRequests(sent || []);
    setLoading(false);
  }

  async function handleApprove(requestId: string) {
    setReceivedRequests(prev =>
      prev.map(r => r.id === requestId ? { ...r, status: 'approved' as const } : r)
    );

    await supabase
      .from('connection_requests')
      .update({ status: 'approved', notified: true })
      .eq('id', requestId);

    loadRequests();
  }

  async function handleDecline(requestId: string) {
    setReceivedRequests(prev =>
      prev.map(r => r.id === requestId ? { ...r, status: 'declined' as const } : r)
    );

    await supabase
      .from('connection_requests')
      .update({ status: 'declined', notified: true })
      .eq('id', requestId);

    loadRequests();
  }

  const formatTime = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    return `${days}d ago`;
  };

  const formatBudget = (cents: number | null) => {
    if (!cents) return null;
    return `R${(cents / 100).toFixed(0)}`;
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'received', label: 'Received' },
    { id: 'sent', label: 'Sent' },
  ];

  const requests = activeTab === 'received' ? receivedRequests : sentRequests;
  const filteredRequests = requests.filter((r) =>
    activeTab === 'received' ? r.status === 'pending' : true
  );

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Connection Requests</h1>

        <div className="flex gap-2 mb-8 border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeRequestTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <RequestsListSkeleton count={5} />
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-20">
            <Clock className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {activeTab === 'received' ? 'No pending requests' : 'No sent requests'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              >
                {activeTab === 'received' ? (
                  <div>
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {request.profiles?.full_name || 'Anonymous'}
                          </h3>
                          {request.profiles?.verified && (
                            <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
                          )}
                        </div>

                        {request.profiles?.profession && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {request.profiles.profession}
                          </p>
                        )}

                        {request.profiles?.skills && request.profiles.skills.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {request.profiles.skills.map((skill) => (
                              <span
                                key={skill}
                                className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}

                        {request.profiles?.bio && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 italic">
                            "{request.profiles.bio}"
                          </p>
                        )}

                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                          {request.profiles?.city && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {request.profiles.city}
                            </div>
                          )}
                          {request.profiles?.experience && (
                            <span>{request.profiles.experience}</span>
                          )}
                          <span>Requested {formatTime(request.created_at)}</span>
                        </div>
                      </div>

                      {request.status === 'pending' ? (
                        <div className="flex items-center gap-2">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleApprove(request.id)}
                            className="p-2 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/40 transition-colors cursor-pointer"
                          >
                            <Check className="w-5 h-5" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleDecline(request.id)}
                            className="p-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors cursor-pointer"
                          >
                            <X className="w-5 h-5" />
                          </motion.button>
                        </div>
                      ) : (
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            request.status === 'approved'
                              ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                              : request.status === 'declined'
                              ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                              : 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                      )}
                    </div>

                    <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">For your note:</p>
                      <p className="text-gray-900 dark:text-white line-clamp-2">{request.notes?.body}</p>
                      {request.notes?.budget && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          Budget: <span className="font-semibold">{formatBudget(request.notes.budget)}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="mb-3">
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                            To: <span className="font-medium text-gray-900 dark:text-white">{request.notes?.profiles?.full_name || 'Anonymous'}</span>
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {formatTime(request.created_at)}
                          </p>
                        </div>

                        <p className="text-gray-900 dark:text-white mb-2 line-clamp-2">{request.notes?.body}</p>

                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                          {request.notes?.budget && (
                            <span className="font-semibold text-gray-700 dark:text-gray-300">
                              {formatBudget(request.notes.budget)}
                            </span>
                          )}
                          {request.notes?.city && <span>{request.notes.city}</span>}
                        </div>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          request.status === 'approved'
                            ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                            : request.status === 'declined'
                            ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                            : request.status === 'closed'
                            ? 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400'
                            : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400'
                        }`}
                      >
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
