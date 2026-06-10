import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { useLanguage } from '@/contexts/LanguageContext';
import { translate } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { BellRing, Mail, Smartphone, Check, FileText, Users, BookOpen, Heart, CalendarDays, Megaphone, Newspaper, Award } from 'lucide-react';
import { CEKALoader } from '@/components/ui/ceka-loader';
import { useToast } from '@/hooks/use-toast';

// ─────────────────────────────────────────────────────────
// CANONICAL CATEGORY MAP: UI key → DB notification_preferences.category
// These match the CHECK constraint in notification_preferences table.
// ─────────────────────────────────────────────────────────
const CANONICAL_CATEGORIES = {
  follow_confirmation:   'follow_confirmation',
  new_bill:              'new_bill',
  bill_status_change:    'bill_status_change',
  volunteer_application: 'volunteer_application',
  campaign_update:       'campaign_update',
  system:                'system',
} as const;

type CanonicalCategory = keyof typeof CANONICAL_CATEGORIES;

// Non-canonical prefs stored only in localStorage
interface LocalPrefs {
  all_enabled:         boolean;
  email_notifications: boolean;
  push_notifications:  boolean;
  community_replies:   boolean;
  resource_updates:    boolean;
  event_reminders:     boolean;
  blog_posts:          boolean;
}

const LOCAL_KEY = 'ceka_notification_settings';

const defaultLocal: LocalPrefs = {
  all_enabled:         true,
  email_notifications: true,
  push_notifications:  true,
  community_replies:   true,
  resource_updates:    true,
  event_reminders:     true,
  blog_posts:          true,
};

const defaultCanonical: Record<CanonicalCategory, boolean> = {
  follow_confirmation:   true,
  new_bill:              true,
  bill_status_change:    true,
  volunteer_application: true,
  campaign_update:       true,
  system:                true,
};

const db = supabase as any;

const NotificationSettings: React.FC = () => {
  const { language } = useLanguage();
  const { session } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const [local, setLocal] = useState<LocalPrefs>(() => {
    const stored = localStorage.getItem(LOCAL_KEY);
    return stored ? JSON.parse(stored) : defaultLocal;
  });

  const [canonical, setCanonical] = useState<Record<CanonicalCategory, boolean>>(defaultCanonical);

  // ── Load canonical prefs from DB on mount ────────────────────────────────
  useEffect(() => {
    const load = async () => {
      if (!session?.user?.id) return;
      const { data } = await db
        .from('notification_preferences')
        .select('category, enabled')
        .eq('user_id', session.user.id);
      if (data && data.length > 0) {
        const merged = { ...defaultCanonical };
        (data as { category: string; enabled: boolean }[]).forEach(row => {
          if (row.category in merged) {
            (merged as any)[row.category] = row.enabled;
          }
        });
        setCanonical(merged);
      }
    };
    load();
  }, [session]);

  // ── Upsert one canonical category row ────────────────────────────────────
  const saveCanonical = async (category: CanonicalCategory, value: boolean) => {
    if (!session?.user?.id) return;
    setSaving(true);
    try {
      await db.from('notification_preferences').upsert(
        { user_id: session.user.id, category, enabled: value, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,category' }
      );
      setLastSaved(new Date());
    } catch (err) {
      console.error('Failed to save preference:', err);
    } finally {
      setTimeout(() => setSaving(false), 400);
    }
  };

  const updateCanonical = (category: CanonicalCategory, value: boolean) => {
    setCanonical(prev => ({ ...prev, [category]: value }));
    saveCanonical(category, value);
  };

  // ── Local (non-canonical) pref helpers ───────────────────────────────────
  const updateLocal = (key: keyof LocalPrefs, value: boolean) => {
    let next = { ...local, [key]: value };
    if (key === 'all_enabled' && !value) {
      next = { ...next, email_notifications: false, push_notifications: false };
    }
    if ((key === 'email_notifications' || key === 'push_notifications') && value) {
      next.all_enabled = true;
    }
    setLocal(next);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
  };

  const handleSave = () => {
    toast({
      title: translate("Preferences saved", language),
      description: translate("Your notification preferences have been updated.", language),
    });
  };

  return (
    <div className="space-y-6">
      {/* Saving indicator */}
      {saving && (
        <div className="fixed top-24 right-6 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl shadow-lg border">
          <CEKALoader variant="ios" size="sm" />
          <span className="text-xs font-medium">{translate("Saving...", language)}</span>
        </div>
      )}

      {/* Master Switch */}
      <Card className="rounded-[2.5rem] border-none shadow-ios-high overflow-hidden bg-white dark:bg-slate-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-primary" />
            {translate("Notification Preferences", language)}
          </CardTitle>
          <CardDescription>
            {translate("Choose which notifications you want to receive", language)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border-2 border-primary/20">
            <div className="space-y-0.5">
              <Label htmlFor="all-notifications" className="font-bold text-primary">
                {translate("Enable All Notifications", language)}
              </Label>
              <p className="text-xs text-muted-foreground">{translate("Receive all system notifications", language)}</p>
            </div>
            <Switch
              id="all-notifications"
              checked={local.all_enabled}
              onCheckedChange={(checked) => updateLocal('all_enabled', checked)}
            />
          </div>

          {local.all_enabled && (
            <>
              <Separator />
              <div className="ml-4 space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="space-y-0.5">
                      <Label htmlFor="email-notifications" className="font-bold">
                        {translate("Email Notifications", language)}
                      </Label>
                      <p className="text-xs text-muted-foreground">{translate("Receive notifications via email", language)}</p>
                    </div>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={local.email_notifications}
                    onCheckedChange={(checked) => updateLocal('email_notifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                      <Smartphone className="h-5 w-5 text-green-500" />
                    </div>
                    <div className="space-y-0.5">
                      <Label htmlFor="push-notifications" className="font-bold">
                        {translate("Push Notifications", language)}
                      </Label>
                      <p className="text-xs text-muted-foreground">{translate("Receive push notifications on your device", language)}</p>
                    </div>
                  </div>
                  <Switch
                    id="push-notifications"
                    checked={local.push_notifications}
                    onCheckedChange={(checked) => updateLocal('push_notifications', checked)}
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── CANONICAL NOTIFICATION CATEGORIES (wired to notification_preferences table) ── */}
      <Card className="rounded-[2.5rem] border-none shadow-ios-high overflow-hidden bg-white dark:bg-slate-900">
        <CardHeader>
          <CardTitle>{translate("Notification Types", language)}</CardTitle>
          <CardDescription>
            {translate("Select the types of notifications you want to receive", language)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {([
            { key: 'follow_confirmation'   as CanonicalCategory, label: 'Bill Follow Confirmations',    desc: 'Confirmation when you follow a new bill',              icon: <FileText className="h-5 w-5 text-kenya-green" />, color: 'bg-kenya-green/10' },
            { key: 'new_bill'              as CanonicalCategory, label: 'New Bills',                    desc: 'Be notified when new bills are added to CEKA',         icon: <FileText className="h-5 w-5 text-amber-500" />,    color: 'bg-amber-500/10' },
            { key: 'bill_status_change'    as CanonicalCategory, label: 'Bill Status Changes',          desc: 'When bills you follow move to a new stage',             icon: <FileText className="h-5 w-5 text-blue-500" />,     color: 'bg-blue-500/10' },
            { key: 'volunteer_application' as CanonicalCategory, label: 'Volunteer Application Updates',desc: 'Updates on your volunteer application status',          icon: <Heart className="h-5 w-5 text-pink-500" />,        color: 'bg-pink-500/10' },
            { key: 'campaign_update'       as CanonicalCategory, label: 'Campaign Updates',             desc: 'New campaigns and milestones from civic campaigns',     icon: <Megaphone className="h-5 w-5 text-violet-500" />,  color: 'bg-violet-500/10' },
            { key: 'system'                as CanonicalCategory, label: 'Badges, Credits & Milestones', desc: 'Badge awards, civic credits earned, and milestones',    icon: <Award className="h-5 w-5 text-yellow-500" />,      color: 'bg-yellow-500/10' },
          ]).map(({ key, label, desc, icon, color }) => (
            <div key={key} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-white/5 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
              <div className={`h-10 w-10 rounded-xl ${color} flex items-center justify-center shrink-0`}>
                {icon}
              </div>
              <div className="flex-1">
                <Label htmlFor={`canonical-${key}`} className="font-bold cursor-pointer">
                  {translate(label, language)}
                </Label>
                <p className="text-xs text-muted-foreground">{translate(desc, language)}</p>
              </div>
              <Checkbox
                id={`canonical-${key}`}
                checked={canonical[key]}
                onCheckedChange={(c) => updateCanonical(key, !!c)}
                className="h-5 w-5"
              />
            </div>
          ))}

          <Separator />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Other Preferences</p>

          {([
            { key: 'community_replies' as keyof LocalPrefs, label: 'Community Replies',         desc: 'Responses to your discussions and comments', icon: <Users       className="h-5 w-5 text-blue-500" />,   color: 'bg-blue-500/10' },
            { key: 'resource_updates'  as keyof LocalPrefs, label: 'New Educational Resources', desc: 'New carousels, PDFs, and learning materials',  icon: <BookOpen    className="h-5 w-5 text-green-500" />,  color: 'bg-green-500/10' },
            { key: 'event_reminders'   as keyof LocalPrefs, label: 'Event Reminders',           desc: 'Reminders for upcoming civic events',           icon: <CalendarDays className="h-5 w-5 text-orange-500" />,color: 'bg-orange-500/10' },
            { key: 'blog_posts'        as keyof LocalPrefs, label: 'Blog Posts',               desc: 'New blog posts and civic analysis articles',    icon: <Newspaper   className="h-5 w-5 text-teal-500" />,  color: 'bg-teal-500/10' },
          ]).map(({ key, label, desc, icon, color }) => (
            <div key={key} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-white/5 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
              <div className={`h-10 w-10 rounded-xl ${color} flex items-center justify-center shrink-0`}>
                {icon}
              </div>
              <div className="flex-1">
                <Label htmlFor={`local-${key}`} className="font-bold cursor-pointer">
                  {translate(label, language)}
                </Label>
                <p className="text-xs text-muted-foreground">{translate(desc, language)}</p>
              </div>
              <Checkbox
                id={`local-${key}`}
                checked={local[key]}
                onCheckedChange={(c) => updateLocal(key, !!c)}
                className="h-5 w-5"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex items-center justify-between">
        {lastSaved && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Check className="h-3 w-3 text-green-500" />
            {translate("Last saved", language)}: {lastSaved.toLocaleTimeString()}
          </p>
        )}
        <Button onClick={handleSave} className="rounded-2xl font-bold ml-auto">
          {translate("Save Changes", language)}
        </Button>
      </div>
    </div>
  );
};

export default NotificationSettings;
