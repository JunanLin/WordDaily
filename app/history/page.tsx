import { createClient } from '@/lib/supabase/server';
import HistoryList from '@/components/HistoryList';

export default async function HistoryPage() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return <div>Unauthorized</div>;

    const { data: history } = await supabase
        .from('user_words')
        .select(`
      *,
      words (
        lemma,
        phonetic,
        word_meanings (
          part_of_speech,
          chinese_translation,
          english_definition,
          example_sentence
        )
      )
    `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    return (
        <div className="space-y-6 pb-20">
            <div className="space-y-1">
                <h2 className="text-3xl font-black font-outfit tracking-tight">Archive</h2>
                <p className="text-white/40 text-sm font-medium tracking-wide">Review your progress through time</p>
            </div>

            <HistoryList history={history || []} />
        </div>
    );
}
