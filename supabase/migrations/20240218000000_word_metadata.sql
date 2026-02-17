-- Add metadata columns to words table
ALTER TABLE public.words 
ADD COLUMN IF NOT EXISTS pos_dist TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT,
ADD COLUMN IF NOT EXISTS bnc_idx INTEGER,
ADD COLUMN IF NOT EXISTS frq_idx INTEGER;

-- Add unique constraint to meanings to prevent duplicates
-- First, clean up existing duplicates to avoid constraint error
DELETE FROM public.meanings a
USING (
  SELECT MIN(ctid) as ctid, word_id, part_of_speech, chinese_meaning
  FROM public.meanings
  GROUP BY word_id, part_of_speech, chinese_meaning
  HAVING COUNT(*) > 1
) b
WHERE a.word_id = b.word_id 
  AND a.part_of_speech = b.part_of_speech 
  AND a.chinese_meaning = b.chinese_meaning
  AND a.ctid <> b.ctid;

-- Now add the constraint
ALTER TABLE public.meanings
ADD CONSTRAINT unique_meaning UNIQUE (word_id, part_of_speech, chinese_meaning);
