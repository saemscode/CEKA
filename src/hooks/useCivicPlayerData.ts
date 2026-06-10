import { useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useCivicPlayerStore } from '@/stores/useCivicPlayerStore';

export const useCivicPlayerData = () => {
  const { user } = useAuth();
  const { addAlert, setLatestHeadline, setTemperature } = useCivicPlayerStore();

  useEffect(() => {
    if (!user) return;

    // Subscribe to bill status changes for followed bills
    const channel = supabase
      .channel('civic-player-bills')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bills' },
        async (payload) => {
          const bill = payload.new as any;
          const oldStatus = (payload.old as any)?.status;
          if (!oldStatus || oldStatus === bill.status) return;

          // Check if user follows this bill
          const { data: follow } = await supabase
            .from('bill_follows')
            .select('id')
            .eq('user_id', user.id)
            .eq('bill_id', bill.id)
            .single();
          if (!follow) return;

          addAlert({
            id: `${bill.id}-${Date.now()}`,
            type: 'bill_status',
            title: `Bill status changed: ${bill.title}`,
            description: `Moved from "${oldStatus}" to "${bill.status}"`,
            url: `/legislative-tracker/bills/${bill.slug || bill.id}`,
            timestamp: new Date(),
            read: false,
          });
          setLatestHeadline(`${bill.title} is now ${bill.status}`);
          setTemperature('warm');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, addAlert, setLatestHeadline, setTemperature]);
};
