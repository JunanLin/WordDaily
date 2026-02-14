import { createClient } from '@/lib/supabase/server';
import { Settings as SettingsIcon, LogOut, Moon, Bell, Target } from 'lucide-react';

export default async function SettingsPage() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return <div>Unauthorized</div>;

    const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

    return (
        <div className="space-y-8 pb-20">
            <div className="space-y-1">
                <h2 className="text-2xl font-bold font-outfit">Settings</h2>
                <p className="text-white/40 text-sm">Personalize your experience</p>
            </div>

            <div className="card space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Target className="text-indigo-400" size={20} />
                        <span className="font-medium">Daily Goal</span>
                    </div>
                    <span className="text-indigo-400 font-bold">{profile?.daily_goal || 20} words</span>
                </div>

                <div className="flex items-center justify-between opacity-50">
                    <div className="flex items-center gap-3">
                        <Moon className="text-purple-400" size={20} />
                        <span className="font-medium">Dark Mode</span>
                    </div>
                    <div className="w-10 h-5 bg-indigo-500 rounded-full cursor-not-allowed" />
                </div>

                <div className="flex items-center justify-between opacity-50">
                    <div className="flex items-center gap-3">
                        <Bell className="text-pink-400" size={20} />
                        <span className="font-medium">Notifications</span>
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest">Coming Soon</span>
                </div>
            </div>

            <div className="card">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-xl">
                        {user.email?.[0].toUpperCase()}
                    </div>
                    <div>
                        <p className="font-bold">{user.email}</p>
                        <p className="text-xs text-white/40 italic">Member since Feb 2024</p>
                    </div>
                </div>

                <form action="/auth/signout" method="post">
                    <button type="submit" className="w-full flex items-center justify-center gap-2 py-3 border border-red-500/20 text-red-400 rounded-xl hover:bg-red-500/5 transition-colors">
                        <LogOut size={18} /> Sign Out
                    </button>
                </form>
            </div>

            <div className="text-center pt-8">
                <p className="text-[10px] text-white/20 uppercase font-bold tracking-[0.2em]">WordDaily v1.0.0</p>
            </div>
        </div>
    );
}
