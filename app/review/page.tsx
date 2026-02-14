import { createClient } from '@/lib/supabase/server';
import ReviewSessionClient from '@/components/ReviewSessionClient';
import { calculatePriority } from '@/lib/services/sm2';

export default async function ReviewPage() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return <div>Unauthorized</div>;

    // Fetch words due for review
    // Joins with words and meanings
    const { data: userWords, error } = await supabase
        .from('user_words')
        .select(`
      *,
      words (
        lemma,
        phonetic,
        audio_url,
        word_meanings (
          id,
          part_of_speech,
          english_definition,
          chinese_translation,
          example_sentence
        )
      )
    `)
        .eq('user_id', user.id)
        .lte('next_review_at', new Date().toISOString());

    if (error) {
        console.error('Error fetching review words:', error);
        return <div>Error loading review session</div>;
    }

    // Calculate priority and sort
    const sortedWords = (userWords || [])
        .map(uw => ({
            ...uw,
            priority: calculatePriority(uw.times_seen, new Date(uw.next_review_at), uw.memory_score)
        }))
        .sort((a, b) => b.priority - a.priority);

    if (sortedWords.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center text-green-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                </div>
                <h2 className="text-2xl font-bold">All caught up!</h2>
                <p className="text-white/40">No words due for review right now.</p>
            </div>
        );
    }

    return (
        <div className="h-full">
            <ReviewSessionClient words={sortedWords} />
        </div>
    );
}
