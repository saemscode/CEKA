/**
 * Pieces Transactions Service
 *
 * Handles the server-side-gated premium download payment flow.
 * Creates pending transaction rows, listens for webhook verification via
 * Supabase Realtime, and retrieves verified signed download URLs.
 *
 * Table shape expected (see supabase/migrations/20260710_piece_transactions.sql):
 *   piece_transactions (
 *     id uuid primary key default gen_random_uuid(),
 *     reference text unique not null,                 -- Paystack reference (idempotency key)
 *     idempotency_key text unique not null,
 *     user_id uuid references auth.users,             -- null for anonymous payers (email-only)
 *     user_email text not null,
 *     content_id uuid references media_content(id),
 *     content_slug text not null,
 *     asset_path text not null,
 *     tier text not null,
 *     amount_kes integer not null,
 *     status text default 'pending'
 *         check (status in ('pending','verified','delivered','failed','refunded')),
 *     verified_at timestamptz,
 *     delivered_at timestamptz,
 *     created_at timestamptz default now()
 *   )
 *
 *   -- Index for common queries
 *   create index idx_piece_transactions_status_created on piece_transactions(status, created_at);
 *   create index idx_piece_transactions_user_id on piece_transactions(user_id);
 */

import { supabase } from '@/integrations/supabase/client';

export interface PieceTransaction {
    id: string;
    reference: string;
    idempotency_key: string;
    user_id: string | null;
    user_email: string;
    content_id: string | null;
    content_slug: string;
    asset_path: string;
    tier: string;
    amount_kes: number;
    status: 'pending' | 'verified' | 'delivered' | 'failed' | 'refunded';
    verified_at: string | null;
    delivered_at: string | null;
    created_at: string;
}

class PiecesTransactionService {
    /**
     * Creates a pending transaction row BEFORE opening Paystack popup.
     * This is the idempotency anchor — the webhook updates this exact row.
     */
    async createPendingTransaction(params: {
        reference: string;
        user_id: string | null;
        user_email: string;
        content_id: string | null;
        content_slug: string;
        asset_path: string;
        tier: string;
        amount_kes: number;
    }): Promise<PieceTransaction | null> {
        const { data, error } = await (supabase as any)
            .from('piece_transactions')
            .insert({
                reference: params.reference,
                idempotency_key: params.reference, // same as reference — one transaction per popup open
                user_id: params.user_id,
                user_email: params.user_email,
                content_id: params.content_id,
                content_slug: params.content_slug,
                asset_path: params.asset_path,
                tier: params.tier,
                amount_kes: params.amount_kes,
                status: 'pending',
            })
            .select()
            .single();

        if (error) {
            console.error('[PiecesTx] createPendingTransaction error:', error);
            return null;
        }
        return data as PieceTransaction;
    }

    /**
     * Subscribe to real-time status updates for a specific transaction reference.
     * Calls `onVerified` when status flips to 'verified'.
     * Returns an unsubscribe function — call it in component cleanup.
     *
     * @param reference  Paystack reference that was passed to Paystack popup
     * @param onVerified Called with the verified transaction when webhook confirms payment
     */
    subscribeToVerification(
        reference: string,
        onVerified: (tx: PieceTransaction) => void
    ): () => void {
        const channel = supabase
            .channel(`tx-verify-${reference}`)
            .on(
                'postgres_changes' as any,
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'piece_transactions',
                    filter: `reference=eq.${reference}`,
                },
                (payload: any) => {
                    const updated = payload.new as PieceTransaction;
                    if (updated.status === 'verified') {
                        onVerified(updated);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }

    /**
     * Fetch a transaction by reference. Used by the "Check again" button
     * after the 90-second timeout expires, and on page-resume after abandonment.
     */
    async getTransactionByReference(reference: string): Promise<PieceTransaction | null> {
        const { data, error } = await (supabase as any)
            .from('piece_transactions')
            .select('*')
            .eq('reference', reference)
            .single();

        if (error) {
            console.error('[PiecesTx] getTransactionByReference error:', error);
            return null;
        }
        return data as PieceTransaction;
    }

    /**
     * Mark a transaction as delivered once the signed URL has been handed to the client.
     * Called after the client successfully receives the URL and triggers the download.
     */
    async markDelivered(transactionId: string): Promise<void> {
        const { error } = await (supabase as any)
            .from('piece_transactions')
            .update({ status: 'delivered', delivered_at: new Date().toISOString() })
            .eq('id', transactionId);
        if (error) {
            console.error('[PiecesTx] markDelivered error:', error);
        }
    }

    /**
     * Fetch all verified-but-undelivered transactions for a user — the
     * "My Downloads / Unclaimed" list shown after abandonment.
     */
    async getUnclaimedDownloads(userId: string): Promise<PieceTransaction[]> {
        const { data, error } = await (supabase as any)
            .from('piece_transactions')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'verified')
            .order('verified_at', { ascending: false });

        if (error) {
            console.error('[PiecesTx] getUnclaimedDownloads error:', error);
            return [];
        }
        return (data as PieceTransaction[]) || [];
    }
}

export const piecesTransactionService = new PiecesTransactionService();
export default piecesTransactionService;
