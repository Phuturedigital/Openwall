import { useEffect, useState } from 'react';
import { ResetPassword } from './ResetPassword';
import { EmailVerified } from './EmailVerified';
import { ForgotPassword } from './ForgotPassword';
import { SurveyView } from './SurveyView';
import { SurveyDashboardView } from './SurveyDashboardView';

type Route = 'app' | 'reset-password' | 'email-verified' | 'forgot-password' | 'survey' | 'survey-dashboard';

export function Router({ children }: { children: React.ReactNode }) {
  const [route, setRoute] = useState<Route>('app');

  useEffect(() => {
    const path = window.location.pathname;
    const hash = window.location.hash;

    if (path === '/reset-password' || hash.includes('type=recovery')) {
      setRoute('reset-password');
    } else if (path === '/email-verified' || hash.includes('type=email')) {
      setRoute('email-verified');
    } else if (path === '/forgot-password') {
      setRoute('forgot-password');
    } else if (path === '/survey') {
      setRoute('survey');
    } else if (path === '/survey-dashboard') {
      setRoute('survey-dashboard');
    } else {
      setRoute('app');
    }

    const handlePopState = () => {
      const newPath = window.location.pathname;
      const newHash = window.location.hash;

      if (newPath === '/reset-password' || newHash.includes('type=recovery')) {
        setRoute('reset-password');
      } else if (newPath === '/email-verified' || newHash.includes('type=email')) {
        setRoute('email-verified');
      } else if (newPath === '/forgot-password') {
        setRoute('forgot-password');
      } else if (newPath === '/survey') {
        setRoute('survey');
      } else if (newPath === '/survey-dashboard') {
        setRoute('survey-dashboard');
      } else {
        setRoute('app');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (route === 'reset-password') {
    return <ResetPassword />;
  }

  if (route === 'email-verified') {
    return <EmailVerified />;
  }

  if (route === 'forgot-password') {
    return <ForgotPassword />;
  }

  if (route === 'survey') {
    return <SurveyView />;
  }

  if (route === 'survey-dashboard') {
    return <SurveyDashboardView />;
  }

  return <>{children}</>;
}
