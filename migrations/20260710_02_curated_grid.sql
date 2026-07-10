-- Add display_order to media_content
ALTER TABLE public.media_content ADD COLUMN IF NOT EXISTS display_order BIGINT DEFAULT 0;

-- Initialize display_order with created_at epoch to maintain chronological order by default
UPDATE public.media_content 
SET display_order = extract(epoch from created_at);
