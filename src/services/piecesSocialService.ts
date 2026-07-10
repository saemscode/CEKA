/**
 * Pieces Social Service
 *
 * Handles Like, Save (bookmark-to-collection), and Share analytics for
 * media_content (Pieces). Works against the `media_interactions` table.
 * All writes are optimistic — call from UI instantly, then sync.
 *
 * Table shape expected (see supabase/migrations/20260710_pieces_social.sql):
 *   media_interactions (
 *     id uuid primary key default gen_random_uuid(),
 *     user_id uuid references auth.users not null,
 *     media_content_id uuid references media_content(id) on delete cascade not null,
 *     interaction_type text check (interaction_type in ('like','save','share')) not null,
 *     created_at timestamptz default now(),
 *     unique(user_id, media_content_id, interaction_type)
 *   )
 */

import { supabase } from '@/integrations/supabase/client';

export type InteractionType = 'like' | 'save' | 'share';

export interface InteractionState {
    liked: boolean;
    saved: boolean;
    like_count: number;
}

class PiecesSocialService {
    /**
     * Batch-fetch interaction state for a list of media_content IDs for a given user.
     * Returns a map of content_id -> { liked, saved, like_count }.
     * Called once per MediaFeed mount; does NOT block render.
     */
    async batchGetInteractionState(
        userId: string,
        contentIds: string[]
    ): Promise<Record<string, InteractionState>> {
        if (!userId || !contentIds.length) return {};

        // 1. Get this user's interactions for all IDs in one query
        const { data: userRows, error: userError } = await (supabase as any)
            .from('media_interactions')
            .select('media_content_id, interaction_type')
            .eq('user_id', userId)
            .in('media_content_id', contentIds)
            .in('interaction_type', ['like', 'save']);

        if (userError) {
            console.error('[PiecesSocial] batchGetInteractionState user fetch error:', userError);
        }

        // 2. Get aggregate like counts for all IDs in one query
        const { data: countRows, error: countError } = await (supabase as any)
            .from('media_interactions')
            .select('media_content_id, interaction_type')
            .in('media_content_id', contentIds)
            .eq('interaction_type', 'like');

        if (countError) {
            console.error('[PiecesSocial] batchGetInteractionState count fetch error:', countError);
        }

        // Build result map
        const result: Record<string, InteractionState> = {};

        // Initialize defaults
        contentIds.forEach(id => {
            result[id] = { liked: false, saved: false, like_count: 0 };
        });

        // Apply user interactions
        if (userRows) {
            (userRows as any[]).forEach((row: any) => {
                const id = row.media_content_id;
                if (!result[id]) result[id] = { liked: false, saved: false, like_count: 0 };
                if (row.interaction_type === 'like') result[id].liked = true;
                if (row.interaction_type === 'save') result[id].saved = true;
            });
        }

        // Apply aggregate counts
        if (countRows) {
            const countMap: Record<string, number> = {};
            (countRows as any[]).forEach((row: any) => {
                countMap[row.media_content_id] = (countMap[row.media_content_id] || 0) + 1;
            });
            Object.keys(countMap).forEach(id => {
                if (result[id]) result[id].like_count = countMap[id];
            });
        }

        return result;
    }

    /**
     * Toggle a like for a media content item. Returns the new liked state.
     */
    async toggleLike(userId: string, contentId: string, currentlyLiked: boolean): Promise<boolean> {
        if (currentlyLiked) {
            const { error } = await (supabase as any)
                .from('media_interactions')
                .delete()
                .eq('user_id', userId)
                .eq('media_content_id', contentId)
                .eq('interaction_type', 'like');
            if (error) {
                console.error('[PiecesSocial] unlike error:', error);
                return currentlyLiked; // Revert optimistic update
            }
            return false;
        } else {
            const { error } = await (supabase as any)
                .from('media_interactions')
                .upsert(
                    { user_id: userId, media_content_id: contentId, interaction_type: 'like' },
                    { onConflict: 'user_id,media_content_id,interaction_type', ignoreDuplicates: true }
                );
            if (error) {
                console.error('[PiecesSocial] like error:', error);
                return currentlyLiked; // Revert optimistic update
            }
            return true;
        }
    }

    /**
     * Toggle a save (bookmark to collection) for a media content item.
     * Returns the new saved state.
     */
    async toggleSave(userId: string, contentId: string, currentlySaved: boolean): Promise<boolean> {
        if (currentlySaved) {
            const { error } = await (supabase as any)
                .from('media_interactions')
                .delete()
                .eq('user_id', userId)
                .eq('media_content_id', contentId)
                .eq('interaction_type', 'save');
            if (error) {
                console.error('[PiecesSocial] unsave error:', error);
                return currentlySaved;
            }
            return false;
        } else {
            const { error } = await (supabase as any)
                .from('media_interactions')
                .upsert(
                    { user_id: userId, media_content_id: contentId, interaction_type: 'save' },
                    { onConflict: 'user_id,media_content_id,interaction_type', ignoreDuplicates: true }
                );
            if (error) {
                console.error('[PiecesSocial] save error:', error);
                return currentlySaved;
            }
            return true;
        }
    }

    /**
     * Record a share event (non-toggleable, additive). Called after Web Share API
     * succeeds or the copy-link fallback fires.
     */
    async recordShare(userId: string | null, contentId: string): Promise<void> {
        if (!userId) return; // Anonymous shares are not tracked
        await (supabase as any)
            .from('media_interactions')
            .insert({ user_id: userId, media_content_id: contentId, interaction_type: 'share' })
            .then(({ error }: any) => {
                if (error && error.code !== '23505') {
                    // 23505 = unique violation (already shared, fine to ignore)
                    console.error('[PiecesSocial] recordShare error:', error);
                }
            });
    }
}

export const piecesSocialService = new PiecesSocialService();
export default piecesSocialService;
