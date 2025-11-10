import { useEffect, useState } from 'react';
import { ResetPassword } from './ResetPassword';
import { EmailVerified } from './EmailVerified';
import { ForgotPassword } from './ForgotPassword';

type Route = 'app' | 'reset-password' | 'email-verified' | 'forgot-password';

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

  return <>{children}</>;
}
