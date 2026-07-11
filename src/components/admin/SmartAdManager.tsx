import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Play, Pause, ExternalLink, Calendar, Target, Activity, Settings2 } from 'lucide-react';
import { CEKALoader } from '@/components/ui/ceka-loader';

interface AdminAd {
  id: string;
  title: string;
  subtitle: string;
  ad_category: string;
  is_active: boolean;
  priority_weight: number;
  start_at: string | null;
  end_at: string | null;
  cta_url: string;
  tier: string;
}

export default function SmartAdManager() {
  const [ads, setAds] = useState<AdminAd[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAds = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('promo_ads')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Could not fetch ads.', variant: 'destructive' });
    } else {
      setAds((data as AdminAd[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAds();
  }, []);

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await (supabase as any)
      .from('promo_ads')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update ad status.', variant: 'destructive' });
      return;
    }
    
    setAds(ads.map(ad => ad.id === id ? { ...ad, is_active: !currentStatus } : ad));
    toast({ title: 'Success', description: 'Ad status updated.' });
  };

  if (loading) return <div className="p-8 flex justify-center"><CEKALoader /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black tracking-tighter">Smart Ad Engine</h2>
          <p className="text-sm text-muted-foreground">Manage dynamic rotation, schedules, and weights.</p>
        </div>
        <Button variant="outline" onClick={() => fetchAds()}>
          Refresh Data
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {ads.map(ad => (
          <Card key={ad.id} className="relative overflow-hidden group border border-border/50 shadow-lg dark:shadow-none bg-card/40 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start mb-2">
                <Badge variant={ad.is_active ? 'default' : 'secondary'} className="uppercase text-[10px] tracking-wider font-black">
                  {ad.is_active ? 'Live' : 'Paused'}
                </Badge>
                <div className="flex gap-2">
                  <Badge variant="outline" className="uppercase text-[10px] tracking-wider text-muted-foreground font-black">
                    {ad.ad_category || ad.tier}
                  </Badge>
                  <Badge variant="outline" className="uppercase text-[10px] tracking-wider text-primary font-black">
                    W: {ad.priority_weight}
                  </Badge>
                </div>
              </div>
              <CardTitle className="text-lg font-bold leading-tight">{ad.title}</CardTitle>
              <CardDescription className="text-xs uppercase tracking-widest font-black text-muted-foreground">{ad.subtitle}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Target className="h-4 w-4" />
                    <span className="truncate">{ad.cta_url}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {ad.start_at ? new Date(ad.start_at).toLocaleDateString() : 'Always'} - 
                      {ad.end_at ? new Date(ad.end_at).toLocaleDateString() : 'Forever'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={ad.is_active} 
                      onCheckedChange={() => toggleStatus(ad.id, ad.is_active)}
                    />
                    <span className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">
                      {ad.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
