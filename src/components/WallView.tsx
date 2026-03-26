import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Paperclip, AlertCircle, CreditCard as Edit2, Trash2, CheckCircle, MapPin, Search, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { supabase, Note, PublicNote } from '../lib/supabase';
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

const SA_CITIES = [
  'Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Port Elizabeth',
  'Bloemfontein', 'East London', 'Pietermaritzburg', 'Polokwane', 'Nelspruit',
  'Rustenburg', 'Kimberley', 'George', 'Richards Bay', 'Witbank',
  'Sandton', 'Midrand', 'Centurion', 'Soweto', 'Benoni',
  'Boksburg', 'Roodepoort', 'Germiston', 'Stellenbosch', 'Paarl',
];

const WALL_CATEGORIES = [
  { value: 'design', label: 'Design' },
  { value: 'writing', label: 'Writing' },
  { value: 'development', label: 'Development' },
  { value: 'tech', label: 'Tech & IT' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'other', label: 'Other' },
];

export function WallView({ searchQuery = '', onSignInRequired }: WallViewProps) {
  const [notes, setNotes] = useState<PublicNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [selectedNote, setSelectedNote] = useState<PublicNote | null>(null);
  const [fullNoteData, setFullNoteData] = useState<Note | null>(null);
  const [editingNote, setEditingNote] = useState<PublicNote | null>(null);
  const [deletingNote, setDeletingNote] = useState<PublicNote | null>(null);
  const [requestStatus, setRequestStatus] = useState<'none' | 'pending' | 'approved' | 'declined' | 'closed'>('none');
  const [unlocked, setUnlocked] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [localSearch, setLocalSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [selectedMode, setSelectedMode] = useState<'all' | 'remote' | 'on_site'>('all');
  const [dateFilter, setDateFilter] = useState<'any' | 'today' | 'week' | 'month'>('any');
  const [sortBy, setSortBy] = useState<'newest' | 'budget_low' | 'budget_high' | 'featured'>('newest');
  const { profile } = useAuth();
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Default to showing all notes — user can filter by city if they want
  useEffect(() => {
    setSelectedCity('');
  }, []);

  useEffect(() => {
    setPage(0);
    loadNotes(0);
  }, [localSearch, selectedCity, sortBy, dateFilter, budgetMin, budgetMax, selectedMode]);

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
    setFullNoteData(null);
    if (selectedNote && profile) {
      checkStatus();
    } else {
      setRequestStatus('none');
      setUnlocked(false);
    }
  }, [selectedNote, profile]);

  async function checkStatus() {
    if (!selectedNote || !profile) return;

    if (selectedNote.is_owner) {
      // Fetch own note (includes contact info)
      const { data: fullNote } = await supabase
        .from('notes')
        .select('*')
        .eq('id', selectedNote.id)
        .maybeSingle();
      if (fullNote) setFullNoteData(fullNote);
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
        const { data: hasUnlocked } = await supabase.rpc('check_user_has_unlocked', {
          p_note_id: selectedNote.id,
        });
        if (hasUnlocked) {
          const { data: fullNote } = await supabase
            .from('notes')
            .select('*')
            .eq('id', selectedNote.id)
            .maybeSingle();
          if (fullNote) setFullNoteData(fullNote);
        }
        setUnlocked(hasUnlocked === true);
      }
    } else {
      setRequestStatus('none');
      setUnlocked(false);
    }
  }

  async function loadNotes(pageNum: number) {
    setLoading(true);

    let query = supabase
      .from('public_notes_feed')
      .select('*');

    if (selectedCity) {
      query = query.ilike('city', selectedCity);
    }

    const effectiveSearch = localSearch.trim() || searchQuery.trim();
    if (effectiveSearch) {
      query = query.or(`body.ilike.%${effectiveSearch}%,title.ilike.%${effectiveSearch}%,city.ilike.%${effectiveSearch}%,category.ilike.%${effectiveSearch}%,area.ilike.%${effectiveSearch}%`);
    }

    // Date filter
    if (dateFilter !== 'any') {
      const now = new Date();
      let from: Date;
      if (dateFilter === 'today') {
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (dateFilter === 'week') {
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else {
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      query = query.gte('created_at', from.toISOString());
    }

    // Budget filter (stored in cents)
    if (budgetMin) query = query.gte('budget', parseFloat(budgetMin) * 100);
    if (budgetMax) query = query.lte('budget', parseFloat(budgetMax) * 100);

    // Work mode filter
    if (selectedMode !== 'all') {
      query = query.eq('work_mode', selectedMode);
    }

    // Sort
    if (sortBy === 'featured') {
      query = query.order('prio', { ascending: false }).order('created_at', { ascending: false });
    } else if (sortBy === 'budget_low') {
      query = query.order('prio', { ascending: false }).order('budget', { ascending: true });
    } else if (sortBy === 'budget_high') {
      query = query.order('prio', { ascending: false }).order('budget', { ascending: false });
    } else {
      // newest (default)
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query
      .range(pageNum * NOTES_PER_PAGE, (pageNum + 1) * NOTES_PER_PAGE - 1);

    if (error) {
      console.error('Error loading notes:', error);
    }

    if (!error && data) {
      setNotes((prev) => (pageNum === 0 ? data as PublicNote[] : [...prev, ...data as PublicNote[]]));
      setHasMore(data.length === NOTES_PER_PAGE);
    }
    setLoading(false);
  }

  async function handleRequestConnect(note?: PublicNote | Note) {
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
      const { data, error } = await supabase.rpc('unlock_note_beta_free', {
        p_note_id: selectedNote.id,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Unlock failed');

      // Fetch full note now that unlock record exists (contact info accessible)
      const { data: fullNote } = await supabase
        .from('notes')
        .select('*')
        .eq('id', selectedNote.id)
        .maybeSingle();

      if (fullNote) setFullNoteData(fullNote);
      setUnlocked(true);
    } catch (err: any) {
      console.error('Unlock error:', err);
      alert(err?.message || 'Failed to unlock contact. Please try again.');
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
      setFullNoteData(null);
    }
  }

  async function handleMarkFulfilled(noteId: string) {
    await supabase
      .from('notes')
      .update({ status: 'fulfilled' })
      .eq('id', noteId);

    setNotes(notes.filter(n => n.id !== noteId));

    if (selectedNote?.id === noteId) {
      setSelectedNote(null);
      setFullNoteData(null);
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

  const isOwner = (note: PublicNote) => note.is_owner;

  const hasActiveFilters =
    selectedCity !== '' || selectedCategory !== '' ||
    budgetMin !== '' || budgetMax !== '' ||
    selectedMode !== 'all' || dateFilter !== 'any' || sortBy !== 'newest';

  const displayNotes = selectedCategory
    ? notes.filter((n) => (n.category || getCategoryFromText(n.body)) === selectedCategory)
    : notes;

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Filter bar */}
        <div className="mb-8 space-y-2">
          {/* Row 1: Search + Location + Sort + Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Search pill */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" aria-hidden="true" />
              <input
                type="text"
                placeholder="Search"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-gray-100 dark:bg-[#111] border border-gray-200 dark:border-[#222] rounded-full text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-700 transition-all"
              />
            </div>

            <div className="flex gap-2">
              {/* Location pill */}
              <div className="relative flex-1 sm:flex-none sm:w-36">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" aria-hidden="true" />
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full pl-9 pr-7 py-3 bg-gray-100 dark:bg-[#111] border border-gray-200 dark:border-[#222] rounded-full text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-700 transition-all appearance-none cursor-pointer"
                >
                  <option value="">All</option>
                  {SA_CITIES.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 pointer-events-none" aria-hidden="true" />
              </div>

              {/* Sort By pill */}
              <div className="relative hidden sm:block">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="pl-3.5 pr-7 py-3 bg-gray-100 dark:bg-[#111] border border-gray-200 dark:border-[#222] rounded-full text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-700 transition-all appearance-none cursor-pointer"
                >
                  <option value="newest">Newest</option>
                  <option value="budget_low">Lowest Budget</option>
                  <option value="budget_high">Highest Budget</option>
                  <option value="featured">Featured First</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 pointer-events-none" aria-hidden="true" />
              </div>

              {/* Filters toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-3 rounded-full text-sm font-medium border transition-all cursor-pointer whitespace-nowrap ${
                  hasActiveFilters
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white'
                    : 'bg-gray-100 dark:bg-[#111] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-[#222] hover:bg-gray-200 dark:hover:bg-[#1a1a1a]'
                }`}
                aria-label="Toggle filters"
              >
                <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
                <span>Filters</span>
              </button>
            </div>
          </div>

          {/* Row 2: Advanced filters panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap items-center gap-2 p-4 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#222] rounded-2xl">
                  {/* Sort (mobile only — desktop shows in row 1) */}
                  <div className="relative sm:hidden">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                      className="pl-3.5 pr-8 py-2.5 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] rounded-full text-sm text-gray-700 dark:text-gray-300 appearance-none cursor-pointer focus:outline-none"
                    >
                      <option value="newest">Newest</option>
                      <option value="budget_low">Lowest Budget</option>
                      <option value="budget_high">Highest Budget</option>
                      <option value="featured">Featured First</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 pointer-events-none" aria-hidden="true" />
                  </div>

                  {/* Category */}
                  <div className="relative">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="pl-3.5 pr-8 py-2.5 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] rounded-full text-sm text-gray-700 dark:text-gray-300 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-700 transition-all"
                    >
                      <option value="">All services</option>
                      {WALL_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 pointer-events-none" aria-hidden="true" />
                  </div>

                  {/* Budget min / max */}
                  <div className="flex items-center gap-1.5">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500 pointer-events-none">R</span>
                      <input
                        type="number"
                        placeholder="Min"
                        min="0"
                        value={budgetMin}
                        onChange={(e) => setBudgetMin(e.target.value)}
                        className="w-24 pl-6 pr-3 py-2.5 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] rounded-full text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-700 transition-all"
                      />
                    </div>
                    <span className="text-gray-400 dark:text-gray-600 text-xs select-none">–</span>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500 pointer-events-none">R</span>
                      <input
                        type="number"
                        placeholder="Max"
                        min="0"
                        value={budgetMax}
                        onChange={(e) => setBudgetMax(e.target.value)}
                        className="w-24 pl-6 pr-3 py-2.5 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] rounded-full text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-700 transition-all"
                      />
                    </div>
                  </div>

                  {/* Mode */}
                  <div className="relative">
                    <select
                      value={selectedMode}
                      onChange={(e) => setSelectedMode(e.target.value as 'all' | 'remote' | 'on_site')}
                      className="pl-3.5 pr-8 py-2.5 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] rounded-full text-sm text-gray-700 dark:text-gray-300 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-700 transition-all"
                    >
                      <option value="all">All</option>
                      <option value="remote">Remote</option>
                      <option value="on_site">On-site</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 pointer-events-none" aria-hidden="true" />
                  </div>

                  {/* Posted Date */}
                  <div className="relative">
                    <select
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value as 'any' | 'today' | 'week' | 'month')}
                      className="pl-3.5 pr-8 py-2.5 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] rounded-full text-sm text-gray-700 dark:text-gray-300 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-700 transition-all"
                    >
                      <option value="any">Any time</option>
                      <option value="today">Today</option>
                      <option value="week">Last 7 days</option>
                      <option value="month">Last 30 days</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 pointer-events-none" aria-hidden="true" />
                  </div>

                  {hasActiveFilters && (
                    <button
                      onClick={() => {
                        setSelectedCity('');
                        setSelectedCategory('');
                        setBudgetMin('');
                        setBudgetMax('');
                        setSelectedMode('all');
                        setDateFilter('any');
                        setSortBy('newest');
                      }}
                      className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" aria-hidden="true" />
                      Reset
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
          {displayNotes.map((note) => {
            const category = note.category || getCategoryFromText(note.body);
            const cardColor = getColorForCategory(category);
            const categoryLabel = getCategoryLabel(category);
            const hasAttachments = false;
            const owner = isOwner(note);
            const posterName = note.poster_name || 'Verified User';
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
                      {posterName !== 'Verified User' ? (
                        <div className="w-6 h-6 rounded-full bg-black dark:bg-white flex items-center justify-center text-white dark:text-black font-semibold text-[10px] shadow-sm">
                          {getInitials(posterName)}
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
            onClick={() => { setSelectedNote(null); setFullNoteData(null); }}
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
                  onClick={() => { setSelectedNote(null); setFullNoteData(null); }}
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

                {fullNoteData?.files && fullNoteData.files.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400 block">Attachments:</span>
                    <div className="space-y-2">
                      {fullNoteData.files.map((file, idx) => (
                        <a
                          key={idx}
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
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
                      {fullNoteData?.contact?.email && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Email:</span>
                          <a
                            href={`mailto:${fullNoteData.contact.email}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                          >
                            {fullNoteData.contact.email}
                          </a>
                        </div>
                      )}
                      {fullNoteData?.contact?.phone && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Phone:</span>
                          <a
                            href={`tel:${fullNoteData.contact.phone}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                          >
                            {fullNoteData.contact.phone}
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
                      onClick={() => handleRequestConnect()}
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
            note={editingNote as unknown as Note}
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
