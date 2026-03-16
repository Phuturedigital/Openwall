import { useState, useEffect, lazy, Suspense } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DarkModeProvider } from './contexts/DarkModeContext';
import { Navigation } from './components/Navigation';
import { WallView } from './components/WallView';
import { EnhancedToast, ToastType } from './components/EnhancedToast';
import { FloatingSearchBar } from './components/FloatingSearchBar';
import { Footer } from './components/Footer';
import { Router } from './components/Router';
import { LoadingLogo } from './components/LoadingLogo';

const RecentNotesView = lazy(() => import('./components/RecentNotesView').then(m => ({ default: m.RecentNotesView })));
const MyNotesView = lazy(() => import('./components/MyNotesView').then(m => ({ default: m.MyNotesView })));
const RequestsView = lazy(() => import('./components/RequestsView').then(m => ({ default: m.RequestsView })));
const PaymentsView = lazy(() => import('./components/PaymentsView').then(m => ({ default: m.PaymentsView })));
const ProfileView = lazy(() => import('./components/ProfileView').then(m => ({ default: m.ProfileView })));
const PastNotesView = lazy(() => import('./components/PastNotesView').then(m => ({ default: m.PastNotesView })));
const SettingsView = lazy(() => import('./components/SettingsView').then(m => ({ default: m.SettingsView })));
const EnhancedAuthModal = lazy(() => import('./components/EnhancedAuthModal').then(m => ({ default: m.EnhancedAuthModal })));
const MinimalPostModal = lazy(() => import('./components/MinimalPostModal').then(m => ({ default: m.MinimalPostModal })));
const OnboardingModal = lazy(() => import('./components/OnboardingModal').then(m => ({ default: m.OnboardingModal })));

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
    const hasCompletedOnboarding = localStorage.getItem('onboardingCompleted');
    if (!user && !hasCompletedOnboarding) {
      setShowOnboarding(true);
    }
  }, [user]);

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
        <LoadingLogo className="w-16 h-16" />
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

  const handlePostSuccess = (city: string) => {
    setShowPostModal(false);
    setToastMessage(`✅ Your post is live in ${city}\nPeople nearby can now find you on Openwall.`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
    setCurrentView('my-notes');
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    localStorage.setItem('onboardingCompleted', 'true');
    setToastMessage('Welcome to Openwall – you\'re all set.');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const renderView = () => {
    const loadingFallback = (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingLogo className="w-12 h-12" />
      </div>
    );

    switch (currentView) {
      case 'wall':
        return <WallView searchQuery={searchQuery} onSignInRequired={() => setShowAuthModal(true)} />;
      case 'recent-notes':
        return (
          <Suspense fallback={loadingFallback}>
            <RecentNotesView searchQuery={searchQuery} />
          </Suspense>
        );
      case 'my-notes':
        return (
          <Suspense fallback={loadingFallback}>
            <MyNotesView />
          </Suspense>
        );
      case 'requests':
        return (
          <Suspense fallback={loadingFallback}>
            <RequestsView />
          </Suspense>
        );
      case 'payments':
        return (
          <Suspense fallback={loadingFallback}>
            <PaymentsView />
          </Suspense>
        );
      case 'profile':
        return (
          <Suspense fallback={loadingFallback}>
            <ProfileView />
          </Suspense>
        );
      case 'past-notes':
        return (
          <Suspense fallback={loadingFallback}>
            <PastNotesView />
          </Suspense>
        );
      case 'settings':
        return (
          <Suspense fallback={loadingFallback}>
            <SettingsView />
          </Suspense>
        );
      default:
        return <WallView searchQuery={searchQuery} onSignInRequired={() => setShowAuthModal(true)} />;
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

      {showOnboarding && (
        <Suspense fallback={null}>
          <OnboardingModal onComplete={handleOnboardingComplete} />
        </Suspense>
      )}

      <AnimatePresence>
        {showAuthModal && (
          <Suspense fallback={null}>
            <EnhancedAuthModal onClose={() => setShowAuthModal(false)} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPostModal && (
          <Suspense fallback={null}>
            <MinimalPostModal
              onClose={() => setShowPostModal(false)}
              onSuccess={handlePostSuccess}
            />
          </Suspense>
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
