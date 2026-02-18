import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { BookOpen, CheckCircle2, AlertCircle } from 'lucide-react';
import { endOfDay, startOfDay } from 'date-fns';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import WordSearch from '@/components/WordSearch';

export default async function HomePage() {
  const supabase = createClient();
  const t = await getTranslations('dashboard');
  const tNav = await getTranslations('nav');
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h2 className="text-2xl font-bold mb-4">{t('welcome')}</h2>
        <p className="text-white/60 mb-8">{t('signInDesc')}</p>
        <Link href="/login" className="btn-primary">{t('signInButton')}</Link>
      </div>
    );
  }

  // Fetch user profile (daily_goal and tutorial_completed)
  const { data: profile } = await supabase
    .from('users')
    .select('daily_goal, tutorial_completed, use_capital_case')
    .eq('id', user.id)
    .single();

  // Redirect to tutorial if user hasn't completed it
  if (profile && !profile.tutorial_completed) {
    redirect('/tutorial');
  }

  const dailyGoal = profile?.daily_goal || 20;

  // Fetch words added today
  const today = new Date();
  const startOfRange = startOfDay(today).toISOString();
  const endOfRange = endOfDay(today).toISOString();

  const { count: wordsAddedToday } = await supabase
    .from('user_words')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', startOfRange)
    .lte('created_at', endOfRange);

  // Fetch words due for review
  const { count: wordsToReview } = await supabase
    .from('user_words')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .lte('next_review_at', new Date().toISOString());

  const progress = Math.min(100, ((wordsAddedToday || 0) / dailyGoal) * 100);
  const isGoalMet = (wordsAddedToday || 0) >= dailyGoal;

  return (
    <div className="space-y-8 pb-10">
      <div className="space-y-2">
        <h2 className="text-3xl font-black font-outfit tracking-tight">{tNav('dashboard')}</h2>
        <p className="text-white/40 text-sm font-medium tracking-wide">Lookup and learn new words every day.</p>
      </div>

      <WordSearch useCapitalCase={profile?.use_capital_case} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Progress Card */}
        <section className="card space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white/80">{t('dailyProgress')}</h3>
            <span className="text-sm font-medium text-indigo-400">
              {wordsAddedToday || 0} / {dailyGoal} {t('words')}
            </span>
          </div>

          <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000 shadow-[0_0_20px_rgba(99,102,241,0.5)]"
              style={{ width: `${progress}%` }}
            />
          </div>

          {isGoalMet ? (
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <CheckCircle2 size={16} />
              <span>{t('goalAchieved')}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-indigo-300 text-sm">
              <AlertCircle size={16} />
              <span>{t('addMore', { count: dailyGoal - (wordsAddedToday || 0) })}</span>
            </div>
          )}
        </section>

        <Link href="/review" className="card group relative flex items-center justify-between overflow-hidden hover:bg-white/10 transition-colors">
          <div className="space-y-1">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/20">{t('dueReview')}</p>
            <h4 className="text-4xl font-black font-outfit">{wordsToReview || 0}</h4>
            <p className="text-xs text-white/40 font-bold uppercase tracking-widest">{t('words')}</p>
          </div>
          <div className="p-4 bg-purple-500/10 rounded-2xl text-purple-400 group-hover:scale-110 group-hover:bg-purple-500/20 transition-all duration-500">
            <BookOpen size={32} />
          </div>
          <div className="absolute -bottom-1 -right-1 text-white/5 font-black text-6xl select-none group-hover:text-white/10 transition-colors">
            REVIEW
          </div>
        </Link>
      </div>

      {/* Daily Quote or Tip (Optional extra) */}
      <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/5 backdrop-blur-sm">
        <p className="text-base italic text-white/50 leading-relaxed">
          &ldquo;{t('quote')}&rdquo;
        </p>
        <p className="text-xs mt-3 font-bold uppercase tracking-widest text-white/20">&mdash; {t('author', { defaultValue: 'Ludwig Wittgenstein' })}</p>
      </div>
    </div>
  );
}
