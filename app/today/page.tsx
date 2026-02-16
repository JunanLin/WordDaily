import { createClient } from '@/lib/supabase/server';
import { startOfDay, endOfDay } from 'date-fns';
import { getTranslations } from 'next-intl/server';
import TodayListClient from '@/components/TodayListClient';

export const dynamic = 'force-dynamic';

export default async function TodayPage() {
    const supabase = createClient();
    const t = await getTranslations('history');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return <div>{t('unauthorized')}</div>;

    const today = new Date();
    const start = startOfDay(today).toISOString();
    const end = endOfDay(today).toISOString();

    const { data: words } = await supabase
        .from('user_words')
        .select(`
            id,
            next_review_at,
            words (
                word,
                phonetic_ipa
            )
        `)
        .eq('user_id', user.id)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false });

    return (
        <div className="space-y-6 pb-20">
            <div className="space-y-1">
                <h2 className="text-3xl font-black font-outfit tracking-tight">{t('todaysWords')}</h2>
                <p className="text-white/40 text-sm font-medium tracking-wide">
                    {words?.length || 0} words added so far.
                </p>
            </div>

            <TodayListClient initialWords={words as any || []} />
        </div>
    );
}
