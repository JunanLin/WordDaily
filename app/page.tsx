import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { BookOpen, CheckCircle2 } from 'lucide-react';
import { endOfDay, startOfDay } from 'date-fns';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import WordSearch from '@/components/WordSearch';
import PWAInstallTrigger from '@/components/PWAInstallTrigger';

export default async function HomePage() {
  const supabase = createClient();
  const t = await getTranslations('dashboard');
  const tNav = await getTranslations('nav');
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h2 className="text-2xl font-bold mb-4">{t('welcome')}</h2>
        <p className="text-[var(--foreground-60)] mb-8">{t('signInDesc')}</p>
        <Link href="/login" className="btn-primary">{t('signInButton')}</Link>
      </div>
    );
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('users')
    .select('daily_goal, tutorial_completed, use_capital_case, timezone')
    .eq('id', user.id)
    .single();

  // Redirect to tutorial if user hasn't completed it
  if (profile && !profile.tutorial_completed) {
    redirect('/tutorial');
  }

  // Fetch words added today in user's timezone
  const userTimezone = profile?.timezone || 'UTC';
  const now = new Date();

  // Get YYYY-MM-DD in user's timezone
  const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: userTimezone }).format(now);

  // Calculate UTC start and end bounds for this local date
  const getUTCRange = (dStr: string, tz: string) => {
    const start = new Date(`${dStr}T00:00:00Z`);
    const getOffset = (d: Date, t: string) => {
      try {
        const utcDate = new Date(d.toLocaleString('en-US', { timeZone: 'UTC' }));
        const tzDate = new Date(d.toLocaleString('en-US', { timeZone: t }));
        return (utcDate.getTime() - tzDate.getTime());
      } catch (e) {
        return 0;
      }
    };
    const offset = getOffset(start, tz);
    const startUTC = new Date(start.getTime() + offset);
    const endUTC = new Date(startUTC.getTime() + 24 * 60 * 60 * 1000 - 1);
    return { start: startUTC.toISOString(), end: endUTC.toISOString() };
  };

  const { start: startOfRange, end: endOfRange } = getUTCRange(dateStr, userTimezone);

  const { count: wordsAddedToday } = await supabase
    .from('user_words')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', startOfRange)
    .lte('created_at', endOfRange);

  const { count: wordsToReview } = await supabase
    .from('user_words')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .lt('memory_score', 10)
    .lte('next_review_at', new Date().toISOString());

  return (
    <div className="space-y-8 pb-10">
      <div className="space-y-2">
        <h2 className="text-3xl font-black font-outfit tracking-tight">{tNav('dashboard')}</h2>
        <p className="text-[var(--foreground-40)] text-sm font-medium tracking-wide">{t('lookupLearnDesc')}</p>
      </div>

      <WordSearch useCapitalCase={profile?.use_capital_case} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Words Added Today Card */}
        <div className="card group relative flex items-center justify-between overflow-hidden hover:bg-indigo-500/5 transition-colors">
          <div className="space-y-1">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--foreground-20)]">{t('todaysWords')}</p>
            <h4 className="text-4xl font-black font-outfit">{wordsAddedToday || 0}</h4>
            <p className="text-xs text-[var(--foreground-40)] font-bold uppercase tracking-widest">{t('words')}</p>
          </div>
          <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all duration-500">
            <CheckCircle2 size={32} />
          </div>
          <div className="absolute -bottom-1 -right-1 text-[var(--foreground-10)] font-black text-6xl select-none group-hover:opacity-20 transition-all">
            TODAY
          </div>
        </div>

        <Link href="/review" className="card group relative flex items-center justify-between overflow-hidden hover:bg-purple-500/5 transition-colors">
          <div className="space-y-1">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--foreground-20)]">{t('dueReview')}</p>
            <h4 className="text-4xl font-black font-outfit">{wordsToReview || 0}</h4>
            <p className="text-xs text-[var(--foreground-40)] font-bold uppercase tracking-widest">{t('words')}</p>
          </div>
          <div className="p-4 bg-purple-500/10 rounded-2xl text-purple-400 group-hover:scale-110 group-hover:bg-purple-500/20 transition-all duration-500">
            <BookOpen size={32} />
          </div>
          <div className="absolute -bottom-1 -right-1 text-[var(--foreground-10)] font-black text-6xl select-none group-hover:opacity-20 transition-all">
            REVIEW
          </div>
        </Link>
      </div>

      {/* Daily Quote or Tip (Optional extra) */}
      <div className="card border-[var(--card-border)]">
        <p className="text-base italic text-[rgb(var(--foreground-rgb))] leading-relaxed">
          &ldquo;{t('quote')}&rdquo;
        </p>
        <p className="text-xs mt-3 font-bold uppercase tracking-widest text-[var(--foreground-60)]">&mdash; {t('author', { defaultValue: 'Ludwig Wittgenstein' })}</p>
      </div>
      <PWAInstallTrigger />
    </div>
  );
}
