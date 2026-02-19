import { createClient } from '@/lib/supabase/server';
import { LogOut, BookOpenCheck, Settings, ArrowRight, ArrowLeft } from 'lucide-react';
import SettingsForm from '@/components/SettingsForm';
import PasswordChangeForm from '@/components/PasswordChangeForm';
import PWAInstallSettingsEntry from '@/components/PWAInstallSettingsEntry';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export default async function SettingsPage() {
    const supabase = createClient();
    const t = await getTranslations();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return <div>Unauthorized</div>;

    const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

    return (
        <div className="space-y-8 pb-20 max-w-2xl mx-auto px-6">
            <div className="space-y-1">
                <div className="flex items-center gap-3 text-white/20 mb-2">
                    <Settings size={16} />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Preferences</span>
                </div>
                <h2 className="text-4xl font-black font-outfit tracking-tight">{t('settings.title')}</h2>
                <p className="text-white/40 text-sm font-medium">Personalize your learning experience</p>
            </div>

            <SettingsForm profile={profile} />

            {/* Security Link */}
            <Link href="/oauth/consent" className="card block hover:bg-white/[0.03] transition-colors border-white/5">
                <div className="flex items-center justify-between py-4 px-2 group">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 shadow-inner">
                            <Settings size={22} className="text-indigo-400" />
                        </div>
                        <div>
                            <p className="font-bold text-lg">{t('settings.security')}</p>
                            <p className="text-xs text-white/30 font-medium">{t('settings.securityDesc')}</p>
                        </div>
                    </div>
                    <div className="text-white/20 group-hover:text-white/40 group-hover:translate-x-1 transition-all">
                        <ArrowRight size={20} />
                    </div>
                </div>
            </Link>

            {/* Tutorial Link */}
            <Link href="/tutorial" className="card block hover:bg-white/[0.03] transition-colors border-white/5">
                <div className="flex items-center justify-between py-4 px-2 group">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 shadow-inner">
                            <BookOpenCheck size={24} />
                        </div>
                        <div>
                            <p className="font-bold text-lg">{t('settings.tutorial')}</p>
                            <p className="text-xs text-white/30 font-medium">Review the app tutorial</p>
                        </div>
                    </div>
                    <div className="text-white/20 group-hover:text-white/40 group-hover:translate-x-1 transition-all">
                        <ArrowRight size={20} />
                    </div>
                </div>
            </Link>
            <PWAInstallSettingsEntry />

            <div className="card bg-white/[0.01] border-white/5">
                <div className="flex items-center gap-5 mb-8 p-1">
                    <div className="w-14 h-14 rounded-[1.5rem] bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center font-black text-2xl shadow-xl shadow-indigo-500/10">
                        {user.email?.[0]}
                    </div>
                    <div className="space-y-0.5">
                        <p className="font-bold text-lg tracking-tight">{user.email}</p>
                        <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">
                            {t('common.memberSince')} {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </p>
                    </div>
                </div>

                <form action="/auth/signout" method="post">
                    <button type="submit" className="w-full flex items-center justify-center gap-3 py-4 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 text-red-400 rounded-2xl transition-all text-sm font-black uppercase tracking-widest active:scale-[0.98]">
                        <LogOut size={18} /> {t('buttons.signOut')}
                    </button>
                </form>
            </div>

            <div className="text-center pt-8">
                <p className="text-[10px] text-white/20 uppercase font-bold tracking-[0.2em]">WordDaily v1.0.0</p>
            </div>
        </div>
    );
}
