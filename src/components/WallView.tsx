import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Paperclip, AlertCircle, CreditCard as Edit2, Trash2, CheckCircle, MapPin } from 'lucide-react';
import { supabase, Note } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { EditNoteModal } from './EditNoteModal';
import { LoadingLogo } from './LoadingLogo';
import { NotesGridSkeleton } from './LoadingSkeleton';

const NOTES_PER_PAGE = 24;

const CATEGORY_COLORS: Record<string, string> = {
  design: '#FFFFFF',
  writing: '#FFFFFF',
  tech: '#FFFFFF',
  marketing: '#FFFFFF',
  development: '#FFFFFF',
  consulting: '#FFFFFF',
  other: '#FFFFFF',
};

const CATEGORY_LABELS: Record<string, string> = {
  design: 'Design',
  writing: 'Writing',
  tech: 'Tech',
  marketing: 'Marketing',
  development: 'Development',
  consulting: 'Consulting',
  other: 'General',
};

function getCategoryFromText(text: string): string {
  const lowerText = text.toLowerCase();
  if (lowerText.includes('design') || lowerText.includes('logo') || lowerText.includes('brand')) return 'design';
  if (lowerText.includes('write') || lowerText.includes('content') || lowerText.includes('article')) return 'writing';
  if (lowerText.includes('tech') || lowerText.includes('software') || lowerText.includes('app')) return 'tech';
  if (lowerText.includes('market') || lowerText.includes('social') || lowerText.includes('ads')) return 'marketing';
  if (lowerText.includes('develop') || lowerText.includes('code') || lowerText.includes('website')) return 'development';
  if (lowerText.includes('consult') || lowerText.includes('advice') || lowerText.includes('strategy')) return 'consulting';
  return 'other';
}

function getColorForCategory(category: string): string {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.other;
}

function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] || CATEGORY_LABELS.other;
}

function timeAgo(date: string): string {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function truncateText(text: string, maxLength: number = 80): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '…';
}

function shouldShowReadMore(text: string): boolean {
  return text.length > 150;
}

function getInitials(name: string): string {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

type WallViewProps = {
  searchQuery?: string;
  onSignInRequired?: () => void;
};

const MAJOR_CITIES = ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria'];

export function WallView({ searchQuery = '', onSignInRequired }: WallViewProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [deletingNote, setDeletingNote] = useState<Note | null>(null);
  const [requestStatus, setRequestStatus] = useState<'none' | 'pending' | 'approved' | 'declined' | 'closed'>('none');
  const [unlocked, setUnlocked] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const { profile } = useAuth();
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (profile && profile.city) {
      setSelectedCity(profile.city);
    } else if (!profile) {
      setSelectedCity(MAJOR_CITIES[0]);
    }
  }, [profile]);

  useEffect(() => {
    setPage(0);
    loadNotes(0);
  }, [searchQuery, selectedCity]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          loadNotes(nextPage);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, page]);

  useEffect(() => {
    if (selectedNote && profile) {
      checkStatus();
    } else {
      setRequestStatus('none');
      setUnlocked(false);
    }
  }, [selectedNote, profile]);

  async function checkStatus() {
    if (!selectedNote || !profile) return;

    if (selectedNote.user_id === profile.id) {
      setUnlocked(true);
      setRequestStatus('none');
      return;
    }

    const { data: request } = await supabase
      .from('connection_requests')
      .select('status')
      .eq('note_id', selectedNote.id)
      .eq('freelancer_id', profile.id)
      .maybeSingle();

    if (request) {
      setRequestStatus(request.status as any);

      if (request.status === 'approved') {
        const { data: unlock } = await supabase
          .from('unlocks')
          .select('payment_status')
          .eq('note_id', selectedNote.id)
          .eq('freelancer_id', profile.id)
          .maybeSingle();

        setUnlocked(unlock?.payment_status === 'paid');
      }
    } else {
      setRequestStatus('none');
      setUnlocked(false);
    }
  }

  async function loadNotes(pageNum: number) {
    setLoading(true);

    let query = supabase
      .from('notes')
      .select('*, profiles!notes_user_id_fkey(*)')
      .neq('status', 'deleted')
      .neq('status', 'fulfilled');

    if (selectedCity) {
      query = query.ilike('city', selectedCity);
    }

    if (searchQuery.trim()) {
      query = query.or(`body.ilike.%${searchQuery}%,title.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%,area.ilike.%${searchQuery}%`);
    }

    const { data, error } = await query
      .order('prio', { ascending: false })
      .order('created_at', { ascending: false })
      .range(pageNum * NOTES_PER_PAGE, (pageNum + 1) * NOTES_PER_PAGE - 1);

    if (error) {
      console.error('Error loading notes:', error);
    }

    if (!error && data) {
      setNotes((prev) => (pageNum === 0 ? data : [...prev, ...data]));
      setHasMore(data.length === NOTES_PER_PAGE);
    }
    setLoading(false);
  }

  async function handleRequestConnect(note?: Note) {
    const targetNote = note || selectedNote;

    if (!profile) {
      if (onSignInRequired) {
        onSignInRequired();
      }
      return;
    }

    if (!targetNote) {
      alert('Please select a note first.');
      return;
    }

    if (requesting) {
      return;
    }

    setRequesting(true);

    try {
      const { data, error } = await supabase.from('connection_requests').insert({
        note_id: targetNote.id,
        freelancer_id: profile.id,
        status: 'pending',
      }).select().maybeSingle();

      if (error) {
        if (error.code === '23505') {
          if (note) {
            alert('You have already sent a connection request for this note.');
          } else {
            setRequestStatus('pending');
            alert('You have already sent a connection request for this note.');
          }
        } else if (error.message && error.message.includes('Daily request limit')) {
          alert('You have reached your daily request limit (10 requests). Please try again tomorrow.');
        } else if (error.message) {
          alert(`Request failed: ${error.message}`);
        } else {
          alert('Failed to send connection request. Please try again.');
        }
      } else if (data) {
        if (note) {
          alert('Connection request sent! The poster will be notified.');
        } else {
          setRequestStatus('pending');
          alert('Connection request sent! The poster will be notified.');
        }
      } else {
        alert('Request processed. Please check your Requests page for status.');
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Unknown error occurred';
      alert(`Failed to send connection request: ${errorMessage}`);
    } finally {
      setRequesting(false);
    }
  }

  async function handleUnlock() {
    if (!profile || !selectedNote || unlocking) return;

    setUnlocking(true);
    try {
      const { error: unlockError } = await supabase.from('unlocks').insert({
        note_id: selectedNote.id,
        freelancer_id: profile.id,
        payment_status: 'paid',
      });

      if (unlockError && unlockError.code !== '23505') throw unlockError;

      await supabase.from('transactions').insert({
        user_id: profile.id,
        note_id: selectedNote.id,
        amount: 1500,
        kind: 'unlock',
        status: 'paid',
      });

      setUnlocked(true);
    } catch (err) {
      console.error('Unlock error:', err);
    } finally {
      setUnlocking(false);
    }
  }

  async function handleDeleteNote() {
    if (!deletingNote || !profile) return;

    await supabase
      .from('notes')
      .update({ status: 'deleted' })
      .eq('id', deletingNote.id);

    setNotes(notes.filter(n => n.id !== deletingNote.id));
    setDeletingNote(null);
    if (selectedNote?.id === deletingNote.id) {
      setSelectedNote(null);
    }
  }

  async function handleMarkFulfilled(noteId: string) {
    await supabase
      .from('notes')
      .update({ status: 'fulfilled' })
      .eq('id', noteId);

    const updatedNotes = notes.map(n =>
      n.id === noteId ? { ...n, status: 'fulfilled' as const } : n
    );
    setNotes(updatedNotes);

    if (selectedNote?.id === noteId) {
      setSelectedNote({ ...selectedNote, status: 'fulfilled' });
    }
  }

  const toggleNoteExpansion = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isMobile) return;
    setExpandedNotes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  };

  const isNoteExpanded = (noteId: string) => expandedNotes.has(noteId);

  const formatBudget = (cents: number | null) => {
    if (!cents) return null;
    return `R${(cents / 100).toFixed(0)}`;
  };

  const isOwner = (note: Note) => profile && note.user_id === profile.id;

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          {profile ? (
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Showing creatives near you — {selectedCity || 'All Locations'}
              </h2>
              <div className="flex flex-wrap gap-3">
                {MAJOR_CITIES.map((city) => (
                  <button
                    key={city}
                    onClick={() => setSelectedCity(city)}
                    className={`px-6 py-2 rounded-full font-medium transition-all ${
                      selectedCity === city
                        ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Browse by city
              </h2>
              <div className="flex flex-wrap gap-3">
                {MAJOR_CITIES.map((city) => (
                  <button
                    key={city}
                    onClick={() => setSelectedCity(city)}
                    className={`px-6 py-2 rounded-full font-medium transition-all ${
                      selectedCity === city
                        ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {loading && page === 0 && (
          <NotesGridSkeleton count={12} />
        )}

        {notes.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 text-lg">No posts yet in this area.</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
              {profile ? (
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('open-post-modal'))}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Be the first to post availability
                </button>
              ) : (
                'Check back later or try a different city'
              )}
            </p>
          </div>
        )}

        {!loading || page > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {notes.map((note) => {
            const category = note.category || getCategoryFromText(note.body);
            const cardColor = getColorForCategory(category);
            const categoryLabel = getCategoryLabel(category);
            const hasAttachments = note.files && note.files.length > 0;
            const owner = isOwner(note);
            const posterProfile = note.profiles as any;
            const posterName = posterProfile?.full_name || 'Verified User';
            const posterCity = posterProfile?.city || note.city;

            return (
              <motion.article
                id={`note-${note.id}`}
                key={note.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                tabIndex={0}
                role="article"
                aria-label={`Note: ${note.title || truncateText(note.body, 50)}`}
                className={`relative min-w-[280px] max-w-[320px] w-full p-5 rounded-2xl transition-all duration-300 flex flex-col bg-white dark:bg-black ${
                  isMobile ? '' : 'cursor-pointer hover:scale-[1.02] hover:shadow-lg'
                } ${
                  isMobile && isNoteExpanded(note.id) ? 'min-h-[320px]' : !isMobile ? 'aspect-square' : 'aspect-square'
                } ${note.prio ? 'featured-gradient-outline shadow-lg' : 'border border-gray-200 dark:border-gray-800 shadow-sm'
                } ${note.status === 'fulfilled' ? 'opacity-75' : ''}`}
                style={{
                  backgroundColor: cardColor,
                }}
                onClick={() => {
                  if (!isMobile) {
                    setSelectedNote(note);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedNote(note);
                  }
                }}
              >
                {note.prio && (
                  <div className="absolute -top-2 -right-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1 z-10">
                    <span>⭐</span>
                    <span>Featured</span>
                  </div>
                )}

                {owner && (
                  <div className="absolute top-3 right-3 flex gap-1.5 z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingNote(note);
                      }}
                      aria-label="Edit note"
                      className="p-1.5 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-gray-700 dark:text-gray-300" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingNote(note);
                      }}
                      aria-label="Delete note"
                      className="p-1.5 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                    </button>
                  </div>
                )}

                <div className="flex flex-col flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs font-medium text-black dark:text-white bg-gray-100 dark:bg-gray-900 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-800">
                      {categoryLabel}
                    </span>
                    {note.status === 'fulfilled' && (
                      <div className="flex items-center gap-1 text-green-700 dark:text-green-600 text-xs font-medium bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-lg">
                        <CheckCircle className="w-3 h-3" />
                        <span>Done</span>
                      </div>
                    )}
                  </div>

                  <h3 className="text-black dark:text-white font-semibold text-lg mb-2 line-clamp-2 leading-tight">
                    {note.title || truncateText(note.body, 60)}
                  </h3>

                  {note.budget && (
                    <p className="text-black dark:text-white font-bold text-xl mb-2">
                      {formatBudget(note.budget)}
                    </p>
                  )}

                  <div className="flex-1 flex flex-col">
                    {note.title && (
                      <div className="relative">
                        <p className={`text-gray-600 dark:text-gray-400 text-sm leading-relaxed transition-all duration-300 ${
                          isNoteExpanded(note.id) ? '' : 'line-clamp-2'
                        }`}>
                          {note.body}
                        </p>
                        {!isNoteExpanded(note.id) && shouldShowReadMore(note.body) && (
                          <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-[var(--card-bg)] to-transparent pointer-events-none"
                               style={{ '--card-bg': cardColor } as React.CSSProperties} />
                        )}
                      </div>
                    )}
                    {!note.title && (
                      <div className="relative">
                        <p className={`text-gray-600 dark:text-gray-400 text-sm leading-relaxed transition-all duration-300 ${
                          isNoteExpanded(note.id) ? '' : 'line-clamp-3'
                        }`}>
                          {note.body}
                        </p>
                        {!isNoteExpanded(note.id) && shouldShowReadMore(note.body) && (
                          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[var(--card-bg)] to-transparent pointer-events-none"
                               style={{ '--card-bg': cardColor } as React.CSSProperties} />
                        )}
                      </div>
                    )}
                    {isMobile && (
                      <div className="flex items-center gap-2 mt-3">
                        {shouldShowReadMore(note.body) && (
                          <button
                            onClick={(e) => toggleNoteExpansion(note.id, e)}
                            className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 text-black dark:text-white text-sm font-semibold rounded-lg transition-all shadow-sm border border-gray-200 dark:border-gray-800"
                            aria-expanded={isNoteExpanded(note.id)}
                          >
                            {isNoteExpanded(note.id) ? 'Show less' : 'Read more'}
                          </button>
                        )}
                        {!owner && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRequestConnect(note);
                            }}
                            disabled={requesting}
                            className={`${shouldShowReadMore(note.body) ? 'flex-1' : 'w-full'} px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {requesting ? 'Sending...' : 'Connect'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      {posterProfile?.full_name ? (
                        <div className="w-6 h-6 rounded-full bg-black dark:bg-white flex items-center justify-center text-white dark:text-black font-semibold text-[10px] shadow-sm">
                          {getInitials(posterProfile.full_name)}
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center text-white text-[10px] shadow-sm">
                          <span>✓</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium truncate">{posterName}</span>
                        </div>
                      </div>
                      {hasAttachments && (
                        <Paperclip className="w-3.5 h-3.5 text-gray-500 dark:text-gray-600 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {(note.city || note.area) && (
                        <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                          <MapPin className="w-3 h-3" />
                          <span>
                            {note.city}
                            {note.area && `, ${note.area}`}
                          </span>
                        </div>
                      )}
                      {note.work_mode && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium">
                          {note.work_mode === 'on-site' ? 'On-site' : note.work_mode === 'remote' ? 'Remote' : 'Both'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.article>
            );
          })}
          </div>
        ) : null}

        <div ref={observerTarget} className="h-20 flex items-center justify-center">
          {loading && page > 0 && <LoadingLogo className="w-8 h-8" />}
        </div>
      </div>

      <AnimatePresence>
        {selectedNote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedNote(null)}
            className="fixed inset-0 bg-black/5 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-gray-200/50 dark:border-gray-700/50"
              style={{ width: '60%' }}
            >
              <div className="flex-shrink-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-700 px-8 py-6 flex items-center justify-between rounded-t-3xl">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Note Details</h3>
                <button
                  onClick={() => setSelectedNote(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-8 space-y-6 overflow-y-auto flex-1">
                {selectedNote.status === 'fulfilled' && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                      <CheckCircle className="w-5 h-5" />
                      <p className="font-medium">This Note has been fulfilled</p>
                    </div>
                    <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                      The poster has found a provider. Thank you for your interest!
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-gray-900 dark:text-white text-base leading-relaxed whitespace-pre-wrap">
                    {selectedNote.body}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  {selectedNote.budget && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 dark:text-gray-400">Budget:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatBudget(selectedNote.budget)}
                      </span>
                    </div>
                  )}

                  {selectedNote.city && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 dark:text-gray-400">City:</span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {selectedNote.city}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-gray-400">Posted:</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {timeAgo(selectedNote.created_at)}
                    </span>
                  </div>
                </div>

                {selectedNote.files && selectedNote.files.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400 block">Attachments:</span>
                    <div className="space-y-2">
                      {selectedNote.files.map((file, idx) => (
                        <a
                          key={idx}
                          href={unlocked ? file.url : '#'}
                          target={unlocked ? "_blank" : undefined}
                          rel="noopener noreferrer"
                          onClick={(e) => !unlocked && e.preventDefault()}
                          className={`flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl transition-colors ${
                            unlocked ? 'hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer' : 'opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <Download className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{file.name}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
                  {isOwner(selectedNote) ? (
                    <div className="space-y-3">
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                        <p className="text-sm text-blue-700 dark:text-blue-300">This is your note</p>
                      </div>
                      {selectedNote.status !== 'fulfilled' && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleMarkFulfilled(selectedNote.id)}
                          className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold shadow-lg shadow-green-600/20 hover:shadow-green-600/30 transition-all flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="w-5 h-5" />
                          Mark as Fulfilled
                        </motion.button>
                      )}
                    </div>
                  ) : selectedNote.status === 'fulfilled' ? (
                    <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-4 text-center">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        This opportunity has been fulfilled
                      </p>
                    </div>
                  ) : unlocked ? (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Contact Information
                      </h4>
                      {selectedNote.contact?.email && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Email:</span>
                          <a
                            href={`mailto:${selectedNote.contact.email}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                          >
                            {selectedNote.contact.email}
                          </a>
                        </div>
                      )}
                      {selectedNote.contact?.phone && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Phone:</span>
                          <a
                            href={`tel:${selectedNote.contact.phone}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                          >
                            {selectedNote.contact.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  ) : requestStatus === 'pending' ? (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                            Request Pending
                          </p>
                          <p className="text-sm text-yellow-700 dark:text-yellow-300">
                            Waiting for poster to approve your connection request
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : requestStatus === 'approved' ? (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleUnlock}
                      disabled={unlocking}
                      className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold shadow-lg shadow-green-600/20 hover:shadow-green-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {unlocking ? 'Processing...' : 'Unlock Contact'}
                    </motion.button>
                  ) : requestStatus === 'declined' ? (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                      <p className="text-sm text-red-700 dark:text-red-300">
                        Your request was declined by the poster
                      </p>
                    </div>
                  ) : requestStatus === 'closed' ? (
                    <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        This Note has been fulfilled by another provider. Thank you for your interest.
                      </p>
                    </div>
                  ) : (
                    <motion.button
                      whileHover={requesting ? {} : { scale: 1.02 }}
                      whileTap={requesting ? {} : { scale: 0.98 }}
                      onClick={handleRequestConnect}
                      disabled={requesting}
                      className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {requesting ? 'Sending Request...' : 'Request to Connect'}
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingNote && (
          <EditNoteModal
            note={editingNote}
            onClose={() => setEditingNote(null)}
            onSuccess={() => {
              setEditingNote(null);
              loadNotes(0);
              setPage(0);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deletingNote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDeletingNote(null)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6"
            >
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Delete Note?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to remove this note? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDeleteNote}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
                >
                  Delete
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setDeletingNote(null)}
                  className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
