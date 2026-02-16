import { createClient } from '@/lib/supabase/server';
import HistoryList from '@/components/HistoryList';
import { getTranslations } from 'next-intl/server';

export default async function HistoryPage() {
  const supabase = createClient();
  const t = await getTranslations('history');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div>{t('unauthorized')}</div>;

  const { data: history } = await supabase
    .from('user_words')
    .select(`
      *,
      words (
        word,
        phonetic_ipa,
        definitions (
          part_of_speech,
          definition_text_zh,
          definition_text_en,
          examples (
            example_en,
            example_zh
          )
        )
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6 pb-20">
      <div className="space-y-1">
        <h2 className="text-3xl font-black font-outfit tracking-tight">{t('title')}</h2>
        <p className="text-white/40 text-sm font-medium tracking-wide">{t('subtitle')}</p>
      </div>

      <HistoryList history={history || []} />
    </div>
  );
}
