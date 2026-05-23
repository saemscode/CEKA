import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Zap, Activity, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const MailingMeshStatus = () => {
    const [status, setStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchStatus = async () => {
        try {
            const { data, error } = await supabase.rpc('get_mailing_mesh_status');
            if (error) throw error;
            setStatus(data);
        } catch (error) {
            console.error('Failed to fetch mailing status:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 30000); // Update every 30s
        return () => clearInterval(interval);
    }, []);

    if (loading || !status) return <div className="h-20 animate-pulse bg-muted rounded-2xl" />;

    const resendProgress = (status.resend_today / status.resend_limit) * 100;
    const brevoProgress = (status.brevo_today / status.brevo_limit) * 100;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="glass-card border-white/10 shadow-ios">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Zap className="h-4 w-4 text-primary" />
                            Resend Mesh
                        </CardTitle>
                        <Badge variant={resendProgress > 90 ? "destructive" : "secondary"} className="rounded-xl">
                            {status.resend_today}/{status.resend_limit}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Progress value={resendProgress} className="h-1.5" />
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                        Primary Delivery Engine
                    </p>
                </CardContent>
            </Card>

            <Card className="glass-card border-white/10 shadow-ios">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Activity className="h-4 w-4 text-kenya-green" />
                            Brevo Failover
                        </CardTitle>
                        <Badge variant={brevoProgress > 90 ? "destructive" : "secondary"} className="rounded-xl">
                            {status.brevo_today}/{status.brevo_limit}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Progress value={brevoProgress} className="h-1.5" />
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                        Reserve Mailing Proxy
                    </p>
                </CardContent>
            </Card>
        </div>
    );
};
