
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/providers/AuthProvider';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/hooks/use-toast';
import { translate } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { 
  UserIcon as User, 
  SettingsIcon as Settings, 
  NotificationIcon as Bell, 
  ShieldIcon as Shield, 
  MoonIcon as Moon, 
  SunIcon as Sun, 
  GlobeIcon as Globe, 
  LogoutIcon as LogOut, 
  CameraIcon as Camera,
  SaveIcon as Save,
  AlertIcon as AlertTriangle,
  SparklesIcon,
  ShieldCheckIcon
} from '@/components/ui/CustomIcons';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { roleService } from '@/services/roleService';

const ProfileSettings = () => {
  const { session, user } = useAuth();
  const navigate = useNavigate();
  const { language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState({
    username: '',
    full_name: '',
    email: '',
    avatar_url: '',
    bio: '',
    location: ''
  });
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [allyOrg, setAllyOrg] = useState<any>(null);
  const [allyName, setAllyName] = useState('');
  const [allyWebsite, setAllyWebsite] = useState('');
  const [allyDescription, setAllyDescription] = useState('');
  const [allyFocusAreas, setAllyFocusAreas] = useState<string[]>([]);
  const [savingAlly, setSavingAlly] = useState(false);

  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    legislative: true,
    community: true,
    resources: true
  });

  useEffect(() => {
    if (!session) {
      navigate('/auth');
      return;
    }
    loadProfile();
    loadRole();
  }, [session, navigate]);

  const loadRole = async () => {
    const role = await roleService.getUserRole(session?.user?.id, session?.user?.email);
    setUserRole(role);
    if (role === 'ally') {
      // Load their org from civic_education_providers
      const { data } = await (supabase.from('civic_education_providers') as any)
        .select('*')
        .eq('submitted_by_user_id', session?.user?.id)
        .maybeSingle();
      setAllyOrg(data);
      if (data) {
        setAllyName(data.name || '');
        setAllyWebsite(data.website_url || '');
        setAllyDescription(data.description || '');
        setAllyFocusAreas(data.focus_areas || []);
      }
    }
  };

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session?.user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile({
          username: data.username || '',
          full_name: data.full_name || '',
          email: data.email || session?.user?.email || '',
          avatar_url: data.avatar_url || '',
          bio: '',
          location: ''
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: translate("Error", language),
        description: translate("Failed to load profile", language),
        variant: "destructive"
      });
    }
  };

  const updateProfile = async () => {
    if (!session?.user?.id) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: session.user.id,
          username: profile.username,
          full_name: profile.full_name,
          email: profile.email,
          avatar_url: profile.avatar_url,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: translate("Success", language),
        description: translate("Profile updated successfully", language)
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: translate("Error", language),
        description: translate("Failed to update profile", language),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateAllyProfile = async () => {
    if (!session?.user?.id || !allyOrg) return;
    setSavingAlly(true);
    try {
      const { error } = await (supabase.from('civic_education_providers') as any)
        .update({
          name: allyName,
          website_url: allyWebsite,
          description: allyDescription,
          focus_areas: allyFocusAreas,
        })
        .eq('id', allyOrg.id);

      if (error) throw error;

      toast({
        title: translate("Success", language),
        description: "Organisation profile updated successfully"
      });
      
      setAllyOrg({
        ...allyOrg,
        name: allyName,
        website_url: allyWebsite,
        description: allyDescription,
        focus_areas: allyFocusAreas
      });
    } catch (error: any) {
      console.error('Error updating ally profile:', error);
      toast({
        title: translate("Error", language),
        description: error.message || "Failed to update organisation profile",
        variant: "destructive"
      });
    } finally {
      setSavingAlly(false);
    }
  };

  const toggleAllyFocusArea = (area: string) => {
    setAllyFocusAreas(prev =>
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    );
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: translate("Error", language),
        description: translate("Failed to sign out", language),
        variant: "destructive"
      });
    }
  };

  if (!session) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <p>{translate("Please sign in to access profile settings", language)}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{translate("Profile Settings", language)}</h1>
          <p className="text-muted-foreground">
            {translate("Manage your account settings and preferences", language)}
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">
              <User className="h-4 w-4 mr-2" />
              {translate("Profile", language)}
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" />
              {translate("Notifications", language)}
            </TabsTrigger>
            <TabsTrigger value="preferences">
              <Settings className="h-4 w-4 mr-2" />
              {translate("Preferences", language)}
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="h-4 w-4 mr-2" />
              {translate("Security", language)}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{translate("Profile Information", language)}</CardTitle>
                <CardDescription>
                  {translate("Update your personal information and profile picture", language)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                    <AvatarFallback className="text-lg">
                      {profile.full_name?.charAt(0) || profile.username?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <Button variant="outline" size="sm">
                      <Camera className="h-4 w-4 mr-2" />
                      {translate("Change Photo", language)}
                    </Button>
                    {/* Role badge */}
                    {userRole === 'ally' && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-kenya-green/10 border border-kenya-green/20 text-kenya-green text-[10px] font-black uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 rounded-full bg-kenya-green animate-pulse" />
                        CEKA Partner
                      </div>
                    )}
                    {(userRole === 'admin' || userRole === 'core_team') && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-kenya-red/10 border border-kenya-red/20 text-kenya-red text-[10px] font-black uppercase tracking-widest">
                        {userRole === 'admin' ? (
                          <>
                            <SparklesIcon size={12} className="text-kenya-red" />
                            <span>Admin</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheckIcon size={12} className="text-kenya-red" />
                            <span>Core Team</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">{translate("Full Name", language)}</Label>
                    <Input
                      id="full_name"
                      value={profile.full_name}
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                      placeholder={translate("Enter your full name", language)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">{translate("Username", language)}</Label>
                    <Input
                      id="username"
                      value={profile.username}
                      onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                      placeholder={translate("Enter your username", language)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{translate("Email Address", language)}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-sm text-muted-foreground">
                    {translate("Email cannot be changed directly. Contact support if needed.", language)}
                  </p>
                </div>

                <Button onClick={updateProfile} disabled={loading} className="w-full sm:w-auto">
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? translate("Saving...", language) : translate("Save Changes", language)}
                </Button>
              </CardContent>
            </Card>

            {/* ── Ally Status Card — only visible to Allies ── */}
            {userRole === 'ally' && (
              <Card className="border-kenya-green/20 bg-gradient-to-br from-white to-kenya-green/[0.03] dark:from-[#0a0a0a] dark:to-kenya-green/[0.06] overflow-hidden">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-kenya-green" />
                        Your Partner Status
                      </CardTitle>
                      <CardDescription>Your CEKA partnership profile</CardDescription>
                    </div>
                    <Badge className="bg-kenya-green/10 text-kenya-green border-kenya-green/20 font-black text-[10px] uppercase tracking-widest">
                      {allyOrg?.is_verified ? 'Active' : 'Pending Review'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {allyOrg ? (
                    <>
                      {!allyOrg.is_verified && (
                        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-700/30 p-4">
                          <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 leading-relaxed">
                            Your application is under review. We'll notify you within 48 hours. Questions? Reach us on WhatsApp.
                          </p>
                          <a
                            href={`https://wa.me/254000000000?text=${encodeURIComponent('Hi CEKA, following up on my Partner application for ' + allyOrg.name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 mt-3 text-[10px] font-black uppercase tracking-widest text-[#25D366] hover:opacity-80 transition-opacity"
                          >
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            Follow up on WhatsApp
                          </a>
                        </div>
                      )}

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="ally-name">Organisation Name</Label>
                          <Input
                            id="ally-name"
                            value={allyName}
                            onChange={(e) => setAllyName(e.target.value)}
                            placeholder="Organisation Name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="ally-web">Website URL</Label>
                          <Input
                            id="ally-web"
                            value={allyWebsite}
                            onChange={(e) => setAllyWebsite(e.target.value)}
                            placeholder="https://yourorg.org"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="ally-desc">About the Organisation / Registration Details</Label>
                        <Textarea
                          id="ally-desc"
                          value={allyDescription}
                          onChange={(e) => setAllyDescription(e.target.value)}
                          placeholder="Tell us about your organization's mission, registration numbers, or local verification references."
                          className="min-h-[100px]"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Focus Areas</Label>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {['Civic Rights', 'Governance', 'Constitution', 'Public Finance', 'Elections', 'Advocacy'].map((area) => (
                            <button
                              key={area}
                              type="button"
                              onClick={() => toggleAllyFocusArea(area)}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                allyFocusAreas.includes(area)
                                  ? 'bg-kenya-green text-white shadow-lg shadow-kenya-green/20'
                                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
                              }`}
                            >
                              {area}
                            </button>
                          ))}
                        </div>
                      </div>

                      <Button onClick={updateAllyProfile} disabled={savingAlly} className="w-full sm:w-auto bg-kenya-green hover:bg-kenya-green/90 text-white">
                        <Save className="h-4 w-4 mr-2" />
                        {savingAlly ? "Saving..." : "Save Organisation Profile"}
                      </Button>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Loading your organisation details...</p>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{translate("Notification Preferences", language)}</CardTitle>
                <CardDescription>
                  {translate("Choose how you want to receive notifications", language)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{translate("Email Notifications", language)}</h4>
                      <p className="text-sm text-muted-foreground">
                        {translate("Receive notifications via email", language)}
                      </p>
                    </div>
                    <Switch
                      checked={notifications.email}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{translate("Push Notifications", language)}</h4>
                      <p className="text-sm text-muted-foreground">
                        {translate("Receive push notifications", language)}
                      </p>
                    </div>
                    <Switch
                      checked={notifications.push}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, push: checked })}
                    />
                  </div>

                  <Separator />

                  <h4 className="font-medium">{translate("Content Notifications", language)}</h4>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="legislative">{translate("Legislative Updates", language)}</Label>
                      <Switch
                        id="legislative"
                        checked={notifications.legislative}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, legislative: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="community">{translate("Community Discussions", language)}</Label>
                      <Switch
                        id="community"
                        checked={notifications.community}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, community: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="resources">{translate("New Resources", language)}</Label>
                      <Switch
                        id="resources"
                        checked={notifications.resources}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, resources: checked })}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{translate("App Preferences", language)}</CardTitle>
                <CardDescription>
                  {translate("Customize your app experience", language)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{translate("Language", language)}</h4>
                    <p className="text-sm text-muted-foreground">
                      {translate("Choose your preferred language", language)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Globe className="h-4 w-4" />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLanguage(language === 'en' ? 'sw' : 'en')}
                    >
                      {language === 'en' ? 'English' : 'Swahili'}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{translate("Theme", language)}</h4>
                    <p className="text-sm text-muted-foreground">
                      {translate("Switch between light and dark mode", language)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {theme === 'dark' ? translate('Dark Mode', language) : translate('Light Mode', language)}
                    </span>
                    <ThemeToggle />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{translate("Account Security", language)}</CardTitle>
                <CardDescription>
                  {translate("Manage your account security settings", language)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">{translate("Account Status", language)}</h4>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {translate("Active", language)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {translate("Account created:", language)} {new Date(session.user.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium mb-2">{translate("Sign Out", language)}</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      {translate("Sign out of your account on this device", language)}
                    </p>
                    <Button variant="outline" onClick={handleSignOut}>
                      <LogOut className="h-4 w-4 mr-2" />
                      {translate("Sign Out", language)}
                    </Button>
                  </div>

                  <Separator />

                  <div className="rounded-md bg-red-50 dark:bg-red-950/20 p-4">
                    <div className="flex">
                      <AlertTriangle className="h-5 w-5 text-red-400" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                          {translate("Danger Zone", language)}
                        </h3>
                        <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                          <p className="mb-3">
                            {translate("Permanently delete your account and all associated data.", language)}
                          </p>
                          <Button variant="destructive" size="sm">
                            {translate("Delete Account", language)}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default ProfileSettings;
