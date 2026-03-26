import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Clock, Shield, MapPin, Mail, Phone, ChevronRight } from 'lucide-react';
import { supabase, ConnectionRequest } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { RequestsListSkeleton } from './LoadingSkeleton';
import { RequesterProfileModal } from './RequesterProfileModal';

type Tab = 'received' | 'sent';

type RequestsViewProps = {
  initialTab?: Tab;
};

export function RequestsView({ initialTab = 'received' }: RequestsViewProps) {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [receivedRequests, setReceivedRequests] = useState<ConnectionRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileRequest, setProfileRequest] = useState<ConnectionRequest | null>(null);

  useEffect(() => {
    if (profile) {
      loadRequests();
    }
  }, [profile]);

  // Realtime: reload when any connection_request changes for this user
  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel('requests-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connection_requests' }, () => {
        loadRequests();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile]);

  async function loadRequests() {
    if (!profile) return;

    setLoading(true);

    // Fetch note IDs owned by this user first, then filter requests by those note IDs.
    // This avoids unreliable PostgREST join-based filtering (.eq('notes.user_id', ...)).
    const { data: ownedNotes } = await supabase
      .from('notes')
      .select('id')
      .eq('user_id', profile.id);

    const ownedNoteIds = (ownedNotes || []).map((n) => n.id);

    const { data: received } = ownedNoteIds.length > 0
      ? await supabase
          .from('connection_requests')
          .select('*, notes(*, profiles!notes_user_id_fkey(*)), profiles!connection_requests_freelancer_id_fkey(*)')
          .in('note_id', ownedNoteIds)
          .order('created_at', { ascending: false })
      : { data: [] };

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
                className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#222] rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                {activeTab === 'received' ? (
                  <div>
                    {/* Clickable requester identity row */}
                    <button
                      onClick={() => setProfileRequest(request)}
                      className="w-full text-left px-6 pt-5 pb-4 hover:bg-gray-50 dark:hover:bg-[#161616] transition-colors group"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Avatar */}
                          <div className="w-10 h-10 rounded-xl bg-gray-900 dark:bg-white flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-white dark:text-gray-900">
                              {(request.profiles?.full_name || 'A').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900 dark:text-white text-sm truncate group-hover:underline">
                                {request.profiles?.full_name || 'Anonymous'}
                              </span>
                              {request.profiles?.verified && (
                                <Shield className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {request.profiles?.profession && <span>{request.profiles.profession}</span>}
                              {request.profiles?.city && (
                                <span className="flex items-center gap-0.5">
                                  <MapPin className="w-3 h-3" />
                                  {request.profiles.city}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline">View profile</span>
                          <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors" />
                        </div>
                      </div>
                    </button>

                    {/* Note preview + quick actions */}
                    <div className="px-6 pb-5">
                      {/* Skills preview */}
                      {request.profiles?.skills && request.profiles.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {request.profiles.skills.slice(0, 4).map((skill) => (
                            <span key={skill} className="px-2.5 py-1 bg-gray-100 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] text-gray-600 dark:text-gray-400 rounded-full text-xs">
                              {skill}
                            </span>
                          ))}
                          {request.profiles.skills.length > 4 && (
                            <span className="px-2.5 py-1 text-gray-400 dark:text-gray-500 text-xs">
                              +{request.profiles.skills.length - 4} more
                            </span>
                          )}
                        </div>
                      )}

                      <div className="pt-3 border-t border-gray-100 dark:border-[#1e1e1e] mb-4">
                        <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Requesting access to your note:</p>
                        <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2">{request.notes?.body}</p>
                        {request.notes?.budget && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Budget: <span className="font-semibold text-gray-700 dark:text-gray-300">{formatBudget(request.notes.budget)}</span>
                          </p>
                        )}
                      </div>

                      {/* Bottom actions row */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {formatTime(request.created_at)}
                        </span>
                        {request.status === 'pending' ? (
                          <div className="flex items-center gap-2">
                            <motion.button
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                              onClick={(e) => { e.stopPropagation(); handleApprove(request.id); }}
                              className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-xs font-semibold hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Approve
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                              onClick={(e) => { e.stopPropagation(); handleDecline(request.id); }}
                              className="flex items-center gap-1.5 px-4 py-2 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                              Decline
                            </motion.button>
                          </div>
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            request.status === 'approved'
                              ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                              : 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                          }`}>
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </span>
                        )}
                      </div>
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

                        {request.status === 'approved' && request.notes?.contact && (
                          <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl space-y-1.5">
                            <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-2">Contact details unlocked</p>
                            {request.notes.contact.email && (
                              <div className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
                                <Mail className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                                <a href={`mailto:${request.notes.contact.email}`} className="hover:underline">{request.notes.contact.email}</a>
                              </div>
                            )}
                            {request.notes.contact.phone && (
                              <div className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
                                <Phone className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                                <a href={`tel:${request.notes.contact.phone}`} className="hover:underline">{request.notes.contact.phone}</a>
                              </div>
                            )}
                          </div>
                        )}
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

      <AnimatePresence>
        {profileRequest && (
          <RequesterProfileModal
            request={profileRequest}
            onClose={() => setProfileRequest(null)}
            onApprove={(id) => { handleApprove(id); }}
            onDecline={(id) => { handleDecline(id); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
