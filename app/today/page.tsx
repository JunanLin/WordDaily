import { createClient } from '@/lib/supabase/server';
import { startOfDay, endOfDay } from 'date-fns';
import { BookOpen, CheckCircle2, Clock } from 'lucide-react';

export default async function TodayPage() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return <div>Unauthorized</div>;

    const today = new Date();
    const start = startOfDay(today).toISOString();
    const end = endOfDay(today).toISOString();

    const { data: words } = await supabase
        .from('user_words')
        .select(`
      *,
      words (
        lemma,
        phonetic
      )
    `)
        .eq('user_id', user.id)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false });

    return (
        <div className="space-y-6 pb-20">
            <div className="space-y-1">
                <h2 className="text-2xl font-bold font-outfit">Today's List</h2>
                <p className="text-white/40 text-sm">Words you added today</p>
            </div>

            <div className="space-y-3">
                {words && words.length > 0 ? (
                    words.map((uw: any) => (
                        <div key={uw.id} className="card py-4 px-5 flex items-center justify-between">
                            <div className="space-y-0.5">
                                <h4 className="text-lg font-bold">{uw.words.lemma}</h4>
                                <p className="text-xs text-white/40 italic">{uw.words.phonetic}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {new Date(uw.next_review_at) > today ? (
                                    <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded">
                                        <CheckCircle2 size={12} /> Learned
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-indigo-400 bg-indigo-400/10 px-2 py-1 rounded">
                                        <Clock size={12} /> Pending
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
                        <BookOpen className="mx-auto text-white/20 mb-4" size={48} />
                        <p className="text-white/40">No words added yet today.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
