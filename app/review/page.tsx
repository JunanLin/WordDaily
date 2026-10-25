import { createClient } from '@/lib/supabase/server';
import ReviewSessionClient from '@/components/ReviewSessionClient';
import { calculatePriority } from '@/lib/services/sm2';
import { getTranslations } from 'next-intl/server';

export default async function ReviewPage() {
    const supabase = createClient();
    const t = await getTranslations('review');
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return <div>{t('unauthorized')}</div>;

    // Fetch words due for review
    // Joins with words and meanings
    const { data: userWords, error } = await supabase
        .from('user_words')
        .select(`
      *,
      dictionary (
        word,
        phonetic,
        translation,
        pos,
        tag,
        bnc,
        frq,
        exchange,
        detail,
        audio
      )
    `)
        .eq('user_id', user.id)
        .lt('memory_score', 10)
        .lte('next_review_at', new Date().toISOString());

    if (error) {
        console.error('Error fetching review words:', error);
        return <div>{t('errorLoading')}</div>;
    }

    // Calculate priority and sort
    const sortedWords = (userWords || [])
        .map(uw => ({
            ...uw,
            priority: calculatePriority(uw.times_seen, new Date(uw.next_review_at), uw.memory_score, uw.last_reviewed_at)
        }))
        .sort((a, b) => b.priority - a.priority);

    // Fetch user profile for settings
    const { data: profile } = await supabase
        .from('users')
        .select('use_capital_case')
        .eq('id', user.id)
        .single();

    return (
        <div className="h-full">
            <ReviewSessionClient words={sortedWords} useCapitalCase={profile?.use_capital_case} />
        </div>
    );
}
