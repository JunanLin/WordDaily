import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { BookOpen, PlusCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { endOfDay, startOfDay } from 'date-fns';

export default async function Dashboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h2 className="text-2xl font-bold mb-4">Welcome to WordDaily</h2>
        <p className="text-white/60 mb-8">Sign in to start your vocabulary journey.</p>
        <Link href="/login" className="btn-primary">Sign In</Link>
      </div>
    );
  }

  // Fetch user profile (daily_goal)
  const { data: profile } = await supabase
    .from('users')
    .select('daily_goal')
    .eq('id', user.id)
    .single();

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
    <div className="space-y-6">
      {/* Progress Card */}
      <section className="card space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white/80">Daily Progress</h3>
          <span className="text-sm font-medium text-indigo-400">
            {wordsAddedToday || 0} / {dailyGoal} words
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
            <span>Daily goal achieved!</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-indigo-300 text-sm">
            <AlertCircle size={16} />
            <span>Add {dailyGoal - (wordsAddedToday || 0)} more words today</span>
          </div>
        )}
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/review" className="card flex flex-col items-center gap-2 hover:bg-white/15 transition-colors group">
          <BookOpen className="text-purple-400 group-hover:scale-110 transition-transform" size={24} />
          <span className="text-2xl font-bold">{wordsToReview || 0}</span>
          <span className="text-xs text-white/40 uppercase tracking-wider">Due Review</span>
        </Link>
        <Link href="/add" className="card flex flex-col items-center gap-2 hover:bg-white/15 transition-colors group">
          <PlusCircle className="text-indigo-400 group-hover:scale-110 transition-transform" size={24} />
          <span className="text-2xl font-bold">Add</span>
          <span className="text-xs text-white/40 uppercase tracking-wider">New Word</span>
        </Link>
      </div>

      {/* Daily Quote or Tip (Optional extra) */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-white/5">
        <p className="text-sm italic text-white/60">
          &quot;The limit of my language means the limit of my world.&quot;
        </p>
        <p className="text-xs mt-2 text-white/40">&mdash; Ludwig Wittgenstein</p>
      </div>
    </div>
  );
}
