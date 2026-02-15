import { createClient } from '@/lib/supabase/server';
import { LogOut } from 'lucide-react';
import SettingsForm from '@/components/SettingsForm';

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

            <SettingsForm profile={profile} />

            <div className="card">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-xl uppercase">
                        {user.email?.[0]}
                    </div>
                    <div>
                        <p className="font-bold">{user.email}</p>
                        <p className="text-xs text-white/40 italic">
                            Member since {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </p>
                    </div>
                </div>

                <form action="/auth/signout" method="post">
                    <button type="submit" className="w-full flex items-center justify-center gap-2 py-3 border border-red-500/20 text-red-400 rounded-xl hover:bg-red-500/5 transition-colors text-sm font-bold uppercase tracking-widest">
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
