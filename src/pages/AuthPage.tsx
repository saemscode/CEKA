import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthModal from '@/components/auth/AuthModal';
import ScrollToTop from '@/components/ScrollToTop';

const AuthPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo');

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <ScrollToTop />
      {/* The modal is rendered without any outer constraints — it controls its own size */}
      <AuthModal
        open={true}
        onOpenChange={(open) => {
          if (!open) navigate(returnTo || '/');
        }}
      />
    </div>
  );
};

export default AuthPage;
