import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DarkModeProvider } from './contexts/DarkModeContext';
import { Navigation } from './components/Navigation';
import { WallView } from './components/WallView';
import { RequestsView } from './components/RequestsView';
import { PaymentsView } from './components/PaymentsView';
import { ProfileView } from './components/ProfileView';
import { PastNotesView } from './components/PastNotesView';
import { AuthModal } from './components/AuthModal';
import { MinimalPostModal } from './components/MinimalPostModal';
import { WelcomeModal } from './components/WelcomeModal';
import { Toast } from './components/Toast';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('wall');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

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
    if (!user && (view === 'requests' || view === 'payments' || view === 'profile' || view === 'past-notes')) {
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
    setCurrentView('wall');
    window.location.reload();
  };

  const handleNoteFullfilled = () => {
    setToastMessage('Your note has been marked as fulfilled and moved to Past Notes.');
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      setCurrentView('past-notes');
    }, 2000);
  };

  const renderView = () => {
    switch (currentView) {
      case 'wall':
        return <WallView />;
      case 'requests':
        return <RequestsView />;
      case 'payments':
        return <PaymentsView />;
      case 'profile':
        return <ProfileView />;
      case 'past-notes':
        return <PastNotesView />;
      default:
        return <WallView />;
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Navigation
        currentView={currentView}
        onViewChange={handleViewChange}
        onPostClick={handlePostClick}
        onSignIn={() => setShowAuthModal(true)}
      />

      {renderView()}

      <WelcomeModal />

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
