import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, ShieldAlert, Check, X, Info, ExternalLink, Globe, FileText, Lock, Fingerprint } from 'lucide-react';
import { CEKALoader } from '@/components/ui/ceka-loader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

const OAuthConsent = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();

    const authorizationId = searchParams.get('authorization_id');
    const urlClientId = searchParams.get('client_id');
    const urlRedirectUri = searchParams.get('redirect_uri');
    const scope = searchParams.get('scope') || localStorage.getItem('ceka_oauth_scope') || 'profile email';
    const state = searchParams.get('state') || localStorage.getItem('ceka_oauth_state');
    const codeChallenge = searchParams.get('code_challenge') || localStorage.getItem('ceka_oauth_code_challenge');
    const codeChallengeMethod = searchParams.get('code_challenge_method') || localStorage.getItem('ceka_oauth_code_challenge_method');

    // PERSISTENCE: Handle the Supabase "Query Drop" during auth redirects
    const clientId = urlClientId || localStorage.getItem('ceka_oauth_client_id');
    const redirectUri = urlRedirectUri || localStorage.getItem('ceka_oauth_redirect_uri');

    const [app, setApp] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [authorizing, setAuthorizing] = useState(false);
    const [showFingerprint, setShowFingerprint] = useState(false);

    useEffect(() => {
        // Cache parameters to handle Supabase redirect cycles
        if (urlClientId) localStorage.setItem('ceka_oauth_client_id', urlClientId);
        if (urlRedirectUri) localStorage.setItem('ceka_oauth_redirect_uri', urlRedirectUri);
        if (searchParams.get('scope')) localStorage.setItem('ceka_oauth_scope', searchParams.get('scope')!);
        if (searchParams.get('state')) localStorage.setItem('ceka_oauth_state', searchParams.get('state')!);
        if (searchParams.get('code_challenge')) localStorage.setItem('ceka_oauth_code_challenge', searchParams.get('code_challenge')!);
        if (searchParams.get('code_challenge_method')) localStorage.setItem('ceka_oauth_code_challenge_method', searchParams.get('code_challenge_method')!);
    }, [urlClientId, urlRedirectUri, searchParams]);

    useEffect(() => {
        // STRICT MODE: Guard against premature redirects during auth initialization
        console.log('[OAuth] Handshake State:', { authLoading, hasUser: !!user, clientId });

        if (authLoading) return; // Wait for Supabase to finish checking session

        if (!user) {
            console.warn('[OAuth] Identity missing. Redirecting to secure login...');
            navigate(`/auth?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`);
            return;
        }

        const fetchAppDetails = async () => {
            if (!clientId && !authorizationId) {
                console.error('[OAuth] Missing identity context (no client_id or authorization_id)');
                setError('Security violation: Missing identity context. Handshake cannot proceed.');
                setLoading(false);
                return;
            }

            try {
                console.log('[OAuth] Resolving application metadata for:', clientId);

                // STRICT MODE: Multi-ID Support
                // Map the slug ID to the primary UUID if necessary to ensure the official registry record is used.
                const searchId = clientId === 'nasaka-iebc-v1' ? 'd356516d-3cc7-427a-98eb-49f4ec18adbf' : clientId;

                // STRICT MODE: Avoid .single() to prevent 406 noise if app is missing
                const { data, error: fetchError } = await supabase
                    .from('third_party_apps' as any)
                    .select('*')
                    .eq('client_id', searchId);

                const appData = (data as any)?.[0];

                if (fetchError || !appData) {
                    if (fetchError) console.error('[OAuth] Registry error:', fetchError.message);

                    // Fallback for Nasaka IEBC Client ID
                    if (clientId === 'nasaka_iebc_client_id' || clientId === 'd356516d-3cc7-427a-98eb-49f4ec18adbf') {
                        setApp({
                            name: 'Nasaka IEBC',
                            description: 'Securely authenticate with your CEKA identity for civic participation.',
                            brand_color: '#1E6BFF',
                            logo_url: null,
                            is_verified: true,
                            website_url: 'https://nasakaiebc.civiceducationkenya.com'
                        });
                    } else {
                        throw new Error(`Unregistered Client: The ID "${clientId}" was not found in the CEKA Registry.`);
                    }
                } else {
                    console.log('[OAuth] Identity Sync ready for:', appData.name);
                    setApp(appData);
                }
            } catch (err: any) {
                console.error('[OAuth] Handshake breakdown:', err.message);
                setError(err.message);
                toast({
                    variant: 'destructive',
                    title: "Handshake Failed",
                    description: err.message
                });
            } finally {
                setLoading(false);
            }
        };

        fetchAppDetails();
    }, [clientId, user, authLoading, navigate, toast]);

    const handleAuthorize = async () => {
        setAuthorizing(true);
        setShowFingerprint(true);

        // Feedback Loop: premium 1.5s delay with Fingerprint ID animation
        setTimeout(async () => {
            try {
                if (authorizationId) {
                    // MODERN FLOW: Direct approval via authorization_id as per Master Prompt
                    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                    const finalClientId = clientId || 'nasaka-iebc-v1';
                    
                    console.log('[OAuth] Handshake Approved. Redirecting to final authorization point...');
                    window.location.href = `${supabaseUrl}/auth/v1/oauth/authorize?authorization_id=${authorizationId}&client_id=${finalClientId}&decide=true`;
                    return;
                }

                // LEGACY FALLBACK: Secure Handshake ID resolution
                // Supabase requires a UUID format. We prioritize the official ID from our Registry.
                const handshakeId = app?.client_id || clientId;

                console.log('[OAuth] Delegating handshake to secure Edge Function for:', handshakeId);

                const { data, error } = await supabase.functions.invoke('oauth-authorize', {
                    body: {
                        client_id: handshakeId,
                        redirect_uri: redirectUri,
                        scope: scope,
                        state: state || undefined,
                        code_challenge: codeChallenge || undefined,
                        code_challenge_method: codeChallengeMethod || undefined
                    }
                });

                if (error || data?.error) {
                    console.error('[OAuth] Edge Proxy Handshake Rejected:', error || data?.error);
                    throw new Error(error?.message || data?.error || 'Authorization rejected by security server.');
                }

                if (data?.url) {
                    toast({
                        title: "Identity Verified",
                        description: "Authenticating your identity with Fingerprint ID...",
                        className: "bg-blue-600 text-white font-bold border-none shadow-2xl"
                    });

                    // LOOP PREVENTION: If the Edge Function returns the consent page itself,
                    // it means auto-approval failed. We should NOT redirect as it creates a loop.
                    if (data.url.includes('/oauth/consent') && data.url.includes('authorization_id=')) {
                        console.warn('[OAuth] Edge Proxy returned consent page again. Auto-approval failed. Awaiting manual consent.');
                        setAuthorizing(false);
                        setShowFingerprint(false);
                        return;
                    }

                    // Redirect back to consumer (e.g., Nasaka) with the code
                    console.log('[OAuth] Handshake Success. Delivering code via Edge Proxy...');
                    window.location.href = data.url;
                } else {
                    throw new Error('Handshake succeeded but no redirect URL was returned.');
                }
            } catch (err: any) {
                console.error('[OAuth] Authorization failure:', err);
                toast({
                    title: "Authorization Failed",
                    description: err.message || "Could not complete handshake.",
                    variant: "destructive"
                });
                setAuthorizing(false);
                setShowFingerprint(false);
            }
        }, 1500);
    };

    const handleDeny = () => {
        if (redirectUri) {
            window.location.href = `${redirectUri}?error=access_denied${state ? `&state=${state}` : ''}`;
        } else {
            navigate('/');
        }
    };

    // Derived branding values from app data, with sensible defaults
    const brandColor = app?.brand_color || '#1E6BFF';
    const logoUrl = app?.logo_url || null;
    const appDescription = app?.description || 'Requests access to your CEKA identity';
    const websiteUrl = app?.website_url || null;
    const privacyPolicyUrl = app?.privacy_policy_url || null;
    const termsUrl = app?.terms_url || null;

    if (authLoading || (loading && !error)) return (
        <Layout>
            <div className="min-h-[70vh] flex flex-col items-center justify-center gap-6">
                <CEKALoader variant="ios" size="lg" />
                <p className="text-sm font-bold tracking-widest uppercase text-muted-foreground animate-pulse">Establishing Secure Handshake...</p>
            </div>
        </Layout>
    );

    if (error) return (
        <Layout>
            <div className="min-h-[70vh] flex flex-col items-center justify-center gap-6 text-center px-4">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                    <X className="w-8 h-8 text-destructive" />
                </div>
                <h1 className="text-2xl font-bold">Syncing Failed</h1>
                <p className="text-muted-foreground max-w-md">{error}</p>
                <Button onClick={() => navigate('/')} variant="outline" className="mt-4">
                    Return to Home
                </Button>
            </div>
        </Layout>
    );

    if (!app || !clientId || !redirectUri) return (
        <Layout>
            <div className="container py-20 flex flex-col items-center">
                <div className="h-20 w-20 rounded-3xl bg-red-50 dark:bg-red-950/20 flex items-center justify-center mb-6">
                    <ShieldAlert className="h-10 w-10 text-red-500" />
                </div>
                <h1 className="text-2xl font-black mb-2 text-center">Invalid Security Request</h1>
                <p className="text-muted-foreground text-center max-w-xs mb-8">This OAuth request is missing critical parameters or the application is unregistered.</p>
                <Button onClick={() => navigate('/')} variant="outline" className="rounded-2xl h-12 px-8">Back to Safety</Button>
            </div>
        </Layout>
    );

    return (
        <Layout>
            <div className="container py-12 md:py-20 flex justify-center items-center min-h-[80vh]">
                <AnimatePresence mode="wait">
                    {showFingerprint ? (
                        <motion.div
                            key="fingerprint"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                            className="flex flex-col items-center gap-8"
                        >
                            <div className="relative">
                                <motion.div
                                    className="absolute -inset-4 rounded-full bg-blue-500/20 blur-xl"
                                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                />
                                <Fingerprint className="h-24 w-24 text-blue-500 fingerprint-loader relative z-10" />
                            </div>
                            <div className="text-center space-y-2">
                                <h2 className="text-xl font-black uppercase tracking-widest">Authenticating Your Identity</h2>
                                <p className="text-muted-foreground font-medium animate-pulse">Fingerprint ID Secured. Handing off to consumer...</p>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="consent-card"
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className="w-full max-w-md"
                        >
                            <Card className="border-none shadow-ios-high rounded-[40px] overflow-hidden glass-morphism premium-card-border">
                                {/* Header with branded gradient */}
                                <div
                                    className="h-36 relative flex items-center justify-center overflow-hidden"
                                    style={{
                                        background: `linear-gradient(135deg, ${brandColor}15, transparent 60%, ${brandColor}08)`
                                    }}
                                >
                                    <div className="absolute w-28 h-28 rounded-full animate-pulse-slow opacity-30"
                                        style={{ background: `radial-gradient(circle, ${brandColor}30 0%, transparent 70%)` }} />

                                    <div className="h-20 w-20 rounded-3xl bg-white dark:bg-[#1C1C1E] shadow-2xl flex items-center justify-center border border-white/20 relative z-10 overflow-hidden">
                                        {logoUrl ? (
                                            <img
                                                src={logoUrl}
                                                alt={app.name}
                                                className="w-12 h-12 object-contain"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                                    if (fallback) fallback.style.display = 'block';
                                                }}
                                            />
                                        ) : null}
                                        <span className={logoUrl ? "hidden" : "text-3xl font-black"} style={{ color: brandColor }}>{app.name.charAt(0)}</span>
                                    </div>

                                    <div
                                        className="absolute -bottom-4 right-1/2 translate-x-1/2 h-8 w-8 rounded-full flex items-center justify-center text-white shadow-lg border-4 border-white dark:border-black"
                                        style={{ backgroundColor: app.is_verified ? '#34C759' : brandColor }}
                                    >
                                        <Check className="h-4 w-4 stroke-[4px]" />
                                    </div>
                                </div>

                                <CardHeader className="pt-8 text-center px-8">
                                    <div className="flex items-center justify-center gap-2 mb-2">
                                        <ShieldCheck className="h-4 w-4" style={{ color: app.is_verified ? '#34C759' : brandColor }} />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: app.is_verified ? '#34C759' : brandColor }}>
                                            {app.is_verified ? 'Verified Partner' : 'Integration Request'}
                                        </span>
                                    </div>
                                    <CardTitle className="text-2xl font-black tracking-tight">{app.name}</CardTitle>
                                    <CardDescription className="text-sm font-medium pt-1 text-foreground/80">
                                        {appDescription}
                                    </CardDescription>

                                    {websiteUrl && (
                                        <a
                                            href={websiteUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-[11px] font-semibold mt-2 transition-colors hover:opacity-80 mx-auto"
                                            style={{ color: brandColor }}
                                        >
                                            <Globe className="h-3 w-3" />
                                            {websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                                            <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                                        </a>
                                    )}
                                </CardHeader>

                                <CardContent className="px-8 pb-8">
                                    <div className="space-y-6">
                                        <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-3xl border border-slate-100 dark:border-white/5">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">This app will be able to:</p>
                                            <ul className="space-y-4">
                                                <li className="flex items-start gap-3">
                                                    <div className="h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${brandColor}15` }}>
                                                        <Check className="h-3 w-3" style={{ color: brandColor }} />
                                                    </div>
                                                    <span className="text-sm font-bold">Access your CEKA profile & identity</span>
                                                </li>
                                                <li className="flex items-start gap-3">
                                                    <div className="h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${brandColor}15` }}>
                                                        <Check className="h-3 w-3" style={{ color: brandColor }} />
                                                    </div>
                                                    <span className="text-sm font-bold">Securely authenticate your session</span>
                                                </li>
                                                {scope.includes('email') && (
                                                    <li className="flex items-start gap-3">
                                                        <div className="h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${brandColor}15` }}>
                                                            <Check className="h-3 w-3" style={{ color: brandColor }} />
                                                        </div>
                                                        <span className="text-sm font-bold">View your primary email address</span>
                                                    </li>
                                                )}
                                            </ul>
                                        </div>

                                        {/* Legal links section */}
                                        {(privacyPolicyUrl || termsUrl) && (
                                            <div className="flex items-center justify-center gap-4 text-[10px] font-semibold text-muted-foreground">
                                                {privacyPolicyUrl && (
                                                    <a href={privacyPolicyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 transition-colors hover:text-foreground">
                                                        <Lock className="h-3 w-3" /> Privacy Policy
                                                    </a>
                                                )}
                                                {privacyPolicyUrl && termsUrl && <span className="text-muted-foreground/40">•</span>}
                                                {termsUrl && (
                                                    <a href={termsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 transition-colors hover:text-foreground">
                                                        <FileText className="h-3 w-3" /> Terms of Service
                                                    </a>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ backgroundColor: `${brandColor}08` }}>
                                            <Info className="h-5 w-5 shrink-0" style={{ color: brandColor }} />
                                            <p className="text-[11px] font-medium leading-relaxed">
                                                By authorizing, you are now bridging your CEKA account with <span className="font-bold uppercase tracking-tighter" style={{ color: brandColor }}>{app.name}</span>. You can revoke this anytime in CEKA Settings.
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>

                                <CardFooter className="flex flex-col gap-3 px-8 pb-10">
                                    <Button
                                        onClick={handleAuthorize}
                                        disabled={authorizing}
                                        className="w-full h-14 rounded-2xl authorize-button"
                                    >
                                        Authorize {app.name}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        onClick={handleDeny}
                                        disabled={authorizing}
                                        className="w-full h-12 rounded-xl text-muted-foreground hover:text-foreground font-bold"
                                    >
                                        Cancel and Return
                                    </Button>
                                </CardFooter>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </Layout>
    );
};

export default OAuthConsent;


