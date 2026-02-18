import { createClient } from '@/lib/supabase/server';
import HistoryList from '@/components/HistoryList';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  const supabase = createClient();
  const t = await getTranslations('history');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div>{t('unauthorized')}</div>;

  // Fetch words added to list
  const { data: history } = await supabase
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
    .order('created_at', { ascending: false });

  // Fetch recent lookups
  const { data: lookups } = await supabase
    .from('user_word_history')
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
    .eq('action_type', 'lookup')
    .order('created_at', { ascending: false })
    .limit(20);

  // Fetch user profile for settings
  const { data: profile } = await supabase
    .from('users')
    .select('use_capital_case')
    .eq('id', user.id)
    .single();

  return (
    <div className="space-y-6 pb-20">
      <div className="space-y-1">
        <h2 className="text-3xl font-black font-outfit tracking-tight">{t('title')}</h2>
        <p className="text-white/40 text-sm font-medium tracking-wide">{t('subtitle')}</p>
      </div>

      <HistoryList
        history={history || []}
        recentLookups={lookups || []}
        useCapitalCase={profile?.use_capital_case}
      />
    </div>
  );
}
