import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DarkModeProvider } from './contexts/DarkModeContext';
import { Navigation } from './components/Navigation';
import { WallView } from './components/WallView';
import { RecentNotesView } from './components/RecentNotesView';
import { MyNotesView } from './components/MyNotesView';
import { PaymentsView } from './components/PaymentsView';
import { ProfileView } from './components/ProfileView';
import { PastNotesView } from './components/PastNotesView';
import { AuthModal } from './components/AuthModal';
import { MinimalPostModal } from './components/MinimalPostModal';
import { WelcomeModal } from './components/WelcomeModal';
import { OnboardingModal } from './components/OnboardingModal';
import { Toast } from './components/Toast';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('wall');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
    if (!user && (view === 'my-notes' || view === 'payments' || view === 'profile')) {
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
    window.location.reload();
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
        return <RecentNotesView />;
      case 'my-notes':
        return <MyNotesView />;
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
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {renderView()}

      <WelcomeModal />

      {showOnboarding && <OnboardingModal onComplete={handleOnboardingComplete} />}

      <AnimatePresence>
        {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {showPostModal && (
          <MinimalPostModal
            onClose={() => setShowPostModal(false)}
            onSuccess={handlePostSuccess}
          />
        )}
      </AnimatePresence>

      <Toast
        message={toastMessage}
        show={showToast}
        onClose={() => setShowToast(false)}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <DarkModeProvider>
        <AppContent />
      </DarkModeProvider>
    </AuthProvider>
  );
}

export default App;
