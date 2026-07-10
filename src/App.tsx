import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Route, Routes, useLocation, Navigate, BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/providers/AuthProvider';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ScrollListener from '@/components/auth/ScrollListener';
import AuthModal from '@/components/auth/AuthModal';
import WelcomeTour from '@/components/tour/WelcomeTour';
import SplashScreen from '@/components/SplashScreen';
import { useAuth } from '@/providers/AuthProvider';
import storageService from '@/services/storageService';
import { GlobalActionModal } from '@/components/auth/GlobalActionModal';
import { SEO } from '@/components/SEO';

// Pages (Lazy Loaded for Code Splitting)
const Index = lazy(() => import('@/pages/Index'));
const AuthPage = lazy(() => import('@/pages/AuthPage'));
const Blog = lazy(() => import('@/pages/Blog'));
const BlogPost = lazy(() => import('@/pages/BlogPost'));
const EventsCalendar = lazy(() => import('@/pages/CivicCalendar'));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const MaintenancePage = lazy(() => import('@/pages/MaintenancePage'));
const ResourceLibrary = lazy(() => import('@/pages/ResourceLibrary'));
const ResourceDetail = lazy(() => import('@/pages/ResourceDetail'));
const OAuthConsent = lazy(() => import('@/pages/OAuthConsent'));
const LegislativeTracker = lazy(() => import('@/pages/LegislativeTracker'));
const LegislativeTrackerDetail = lazy(() => import('@/pages/LegislativeTrackerDetail'));
const LegislationDetail = lazy(() => import('@/pages/LegislationDetail'));
const BillDetail = lazy(() => import('@/pages/BillDetail'));
const RejectFinanceBill = lazy(() => import('@/pages/RejectFinanceBill'));
const SHAmbles = lazy(() => import('@/pages/SHAmbles'));
const PeoplesAuditPage = lazy(() => import('@/pages/PeoplesAuditPage'));
const NasakaPage = lazy(() => import('@/pages/NasakaIEBCPage'));
// Volunteer pages removed - functionality merged into JoinCommunity
const Notifications = lazy(() => import('@/pages/Notifications'));
const AdvocacyToolkit = lazy(() => import('@/pages/AdvocacyToolkit'));
const AdvocacyToolkitDetail = lazy(() => import('@/pages/AdvocacyToolkitDetail'));
const JoinCommunity = lazy(() => import('@/pages/JoinCommunity'));
const ConstitutionPage = lazy(() => import('@/pages/ConstitutionPage'));
const CommunityPortal = lazy(() => import('@/pages/CommunityPortal'));
const LegalPage = lazy(() => import('@/pages/LegalPage'));
const FeedbackPage = lazy(() => import('@/pages/FeedbackPage'));
const DiscussionDetail = lazy(() => import('@/pages/DiscussionDetail'));
const CampaignDetail = lazy(() => import('@/pages/CampaignDetail'));
const SearchResults = lazy(() => import('@/pages/SearchResults'));
const DocumentViewerPage = lazy(() => import('@/pages/DocumentViewerPage'));
const ResourceUpload = lazy(() => import('@/pages/ResourceUpload'));
const PendingResources = lazy(() => import('@/pages/PendingResources'));
const ThumbnailDemo = lazy(() => import('@/pages/ThumbnailDemo'));
const SettingsLayout = lazy(() => import('@/pages/settings/SettingsLayout'));
const AccountSettings = lazy(() => import('@/pages/settings/AccountSettings'));
const NotificationSettings = lazy(() => import('@/pages/settings/NotificationSettings'));
const AppearanceSettings = lazy(() => import('@/pages/settings/AppearanceSettings'));
const PrivacySettings = lazy(() => import('@/pages/settings/PrivacySettings'));
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'));
const TermsConditions = lazy(() => import('@/pages/TermsConditions'));
const Pieces = lazy(() => import('@/pages/Pieces'));
const PartnerDashboard = lazy(() => import('@/pages/PartnerDashboard'));
const Tools = lazy(() => import('@/pages/Tools'));
const About = lazy(() => import('@/pages/About'));
const TemplateViewerPage = lazy(() => import('@/pages/TemplateViewerPage'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const TransparencyManifesto = lazy(() => import('@/pages/TransparencyManifesto'));
const InfrastructureDetails = lazy(() => import('@/pages/InfrastructureDetails'));
const TranslatePage = lazy(() => import('@/pages/TranslatePage'));
const ArticleViewer = lazy(() => import('@/pages/ArticleViewer'));
const DonationSuccess = lazy(() => import('@/pages/DonationSuccess'));
const CivicPointsPage = lazy(() => import('@/pages/settings/CivicPointsPage'));

const queryClient = new QueryClient();

const ScrollToTop = () => {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  return null;
};

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();

  if (loading) {
    return <div className="flex h-screen w-full items-center justify-center">Loading...</div>;
  }

  if (!session) {
    return <Navigate to="/auth" />;
  }

  return <>{children}</>;
};

const AppContent = () => {
  const { session } = useAuth();
  const [showWelcomeTour, setShowWelcomeTour] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Hide splash screen after 2 seconds
    const splashTimer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);

    // GO HAM: Pre-initialize storage system early to avoid race conditions on first media load
    storageService.initialize().then(() => {
      console.log('[App] Storage system ready for media hydration');
    });

    return () => clearTimeout(splashTimer);
  }, []);

  useEffect(() => {
    if (session && !showSplash) {
      const hasSeenTour = localStorage.getItem('ceka-welcome-tour-seen');
      if (!hasSeenTour) {
        setShowWelcomeTour(true);
      }
    }
  }, [session, showSplash]);

  const handleTourComplete = () => {
    localStorage.setItem('ceka-welcome-tour-seen', 'true');
    setShowWelcomeTour(false);
  };

  return (
    <>
      <SEO />
      {showSplash && <SplashScreen />}
      <ScrollToTop />
      {showWelcomeTour && <WelcomeTour onComplete={handleTourComplete} />}
      <Suspense fallback={<SplashScreen />}>
        <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/calendar" element={<EventsCalendar />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/maintenance" element={<MaintenancePage />} />
        <Route path="/transparency" element={<TransparencyManifesto />} />
        <Route path="/infrastructure" element={<InfrastructureDetails />} />
        <Route path="/resources" element={<ResourceLibrary />} />
        <Route path="/resources/:id" element={<ResourceDetail />} />
        <Route path="/resources/type/:type" element={<ResourceLibrary />} />
        <Route path="/resources/upload" element={
          <ProtectedRoute>
            <ResourceUpload />
          </ProtectedRoute>
        } />
        <Route path="/resources/pending" element={
          <ProtectedRoute>
            <PendingResources />
          </ProtectedRoute>
        } />
        <Route path="/resource-hub" element={<Navigate to="/resources" replace />} />
        <Route path="/oauth/consent" element={<OAuthConsent />} />
        <Route path="/legislative-tracker" element={<LegislativeTracker />} />
        <Route path="/legislative-tracker/:id" element={<LegislativeTrackerDetail />} />
        <Route path="/legislation/:id" element={<LegislationDetail />} />
        <Route path="/bill/:slug" element={<BillDetail />} />
        <Route path="/template/:id" element={<TemplateViewerPage />} />
        <Route path="/reject-finance-bill" element={<RejectFinanceBill />} />
        <Route path="/shambles" element={<SHAmbles />} />
        <Route path="/peoples-audit" element={<PeoplesAuditPage />} />
        <Route path="/nasaka" element={<Navigate to="/nasaka-iebc" replace />} />
        <Route path="/nasaka-iebc" element={<NasakaPage />} />
        <Route path="/civic-calendar" element={<Navigate to="/calendar" replace />} />
        {/* Volunteer routes redirect to join-community */}
        <Route path="/volunteer" element={<Navigate to="/join-community?tab=volunteer" replace />} />
        <Route path="/volunteer/apply/:id" element={<Navigate to="/join-community?tab=volunteer" replace />} />
        <Route path="/profile" element={<Navigate to="/settings/account" replace />} />
        <Route path="/profile/settings" element={<Navigate to="/settings/account" replace />} />
        <Route path="/notifications" element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        } />
        <Route path="/advocacy-toolkit" element={<AdvocacyToolkit />} />
        <Route path="/advocacy-toolkit/:id" element={<AdvocacyToolkitDetail />} />
        <Route path="/join-community" element={<JoinCommunity />} />
        <Route path="/constitution" element={<ConstitutionPage />} />
        <Route path="/constitution/article/:articleId" element={<ArticleViewer />} />
        <Route path="/constitution/chapter/:chapterId/article/:articleId" element={<ArticleViewer />} />
        <Route path="/community" element={<CommunityPortal />} />
        <Route path="/legal" element={<LegalPage />} />
        <Route path="/feedback" element={<FeedbackPage />} />
        <Route path="/discussion/:id" element={<DiscussionDetail />} />
        <Route path="/campaign/:id" element={<CampaignDetail />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/pieces" element={<Pieces />} />
        <Route path="/pieces/:slug" element={<Pieces />} />
        <Route path="/partner/dashboard" element={
          <ProtectedRoute>
            <PartnerDashboard />
          </ProtectedRoute>
        } />
        <Route path="/tools" element={<Tools />} />
        <Route path="/about" element={<About />} />
        <Route path="/translate" element={<TranslatePage />} />
        <Route path="/visual-insights" element={<Navigate to="/pieces" replace />} />
        <Route path="/account" element={<Navigate to="/settings/account" replace />} />
        <Route path="/document/:id" element={<DocumentViewerPage />} />
        <Route path="/thumbnail-demo" element={<ThumbnailDemo />} />
        <Route path="/donation-success" element={<DonationSuccess />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsConditions />} />
        <Route path="/settings" element={<SettingsLayout />}>
          <Route index element={<Navigate to="/settings/account" replace />} />
          <Route path="account" element={<AccountSettings />} />
          <Route path="notifications" element={<NotificationSettings />} />
          <Route path="appearance" element={<AppearanceSettings />} />
          <Route path="privacy" element={<PrivacySettings />} />
          <Route path="civic-points" element={<CivicPointsPage />} />
        </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <Toaster />
      <Sonner />
    </>
  );
};

const App = () => {
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setAuthModalOpen(true);
    window.addEventListener('ceka:open-auth-modal', handleOpen);
    return () => window.removeEventListener('ceka:open-auth-modal', handleOpen);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <TooltipProvider>
              <ScrollListener>
                <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
                <GlobalActionModal />
                <AppContent />
              </ScrollListener>
            </TooltipProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
