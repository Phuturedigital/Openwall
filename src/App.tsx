import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DarkModeProvider } from './contexts/DarkModeContext';
import { Navigation } from './components/Navigation';
import { WallView } from './components/WallView';
import { RecentNotesView } from './components/RecentNotesView';
import { MyNotesView } from './components/MyNotesView';
import { RequestsView } from './components/RequestsView';
import { PaymentsView } from './components/PaymentsView';
import { ProfileView } from './components/ProfileView';
import { PastNotesView } from './components/PastNotesView';
import { EnhancedAuthModal } from './components/EnhancedAuthModal';
import { MinimalPostModal } from './components/MinimalPostModal';
import { OnboardingModal } from './components/OnboardingModal';
import { EnhancedToast, ToastType } from './components/EnhancedToast';
import { FloatingSearchBar } from './components/FloatingSearchBar';
import { Footer } from './components/Footer';
import { Router } from './components/Router';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('wall');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<ToastType>('success');

  const showToastMessage = (message: string, type: ToastType = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const showSearchBar = currentView === 'wall' || currentView === 'recent-notes';

  useEffect(() => {
    const onboarded = localStorage.getItem('onboarded');
    if (!onboarded) {
      setShowOnboarding(true);
    }
  }, []);

  useEffect(() => {
    const handleNoteFulfilled = () => {
      setToastMessage('✅ Your note has been marked as fulfilled and moved to Past Notes.');
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        setCurrentView('past-notes');
      }, 2000);
    };

    const handleNoteReposted = () => {
      setToastMessage('Your note has been reposted successfully.');
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        setCurrentView('my-notes');
      }, 2000);
    };

    window.addEventListener('note-fulfilled', handleNoteFulfilled);
    window.addEventListener('note-reposted', handleNoteReposted);

    return () => {
      window.removeEventListener('note-fulfilled', handleNoteFulfilled);
      window.removeEventListener('note-reposted', handleNoteReposted);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  const handlePostClick = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setShowPostModal(true);
  };

  const handleViewChange = (view: string) => {
    if (!user && (view === 'my-notes' || view === 'requests' || view === 'payments' || view === 'profile')) {
      setShowAuthModal(true);
      return;
    }
    setCurrentView(view);
  };

  const handlePostSuccess = () => {
    setShowPostModal(false);
    setToastMessage('Note posted successfully');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
    setCurrentView('my-notes');
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setToastMessage('Welcome to Openwall – you\'re all set.');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const renderView = () => {
    switch (currentView) {
      case 'wall':
        return <WallView searchQuery={searchQuery} />;
      case 'recent-notes':
        return <RecentNotesView searchQuery={searchQuery} />;
      case 'my-notes':
        return <MyNotesView />;
      case 'requests':
        return <RequestsView />;
      case 'payments':
        return <PaymentsView />;
      case 'profile':
        return <ProfileView />;
      case 'past-notes':
        return <PastNotesView />;
      default:
        return <WallView searchQuery={searchQuery} />;
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Navigation
        currentView={currentView}
        onViewChange={handleViewChange}
        onPostClick={handlePostClick}
        onSignIn={() => setShowAuthModal(true)}
        onLogout={() => showToastMessage('You\'ve been logged out safely.', 'info')}
      />

      {showSearchBar && <FloatingSearchBar onSearch={handleSearchChange} />}

      {renderView()}

      {showOnboarding && <OnboardingModal onComplete={handleOnboardingComplete} />}

      <AnimatePresence>
        {showAuthModal && <EnhancedAuthModal onClose={() => setShowAuthModal(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {showPostModal && (
          <MinimalPostModal
            onClose={() => setShowPostModal(false)}
            onSuccess={handlePostSuccess}
          />
        )}
      </AnimatePresence>

      <EnhancedToast
        message={toastMessage}
        type={toastType}
        show={showToast}
        onClose={() => setShowToast(false)}
      />

      <Footer />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <DarkModeProvider>
        <Router>
          <AppContent />
        </Router>
      </DarkModeProvider>
    </AuthProvider>
  );
}

export default App;
