'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Lock, Save, Loader2, CheckCircle, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function PasswordChangeForm() {
    const tAuth = useTranslations('auth');
    const tSettings = useTranslations('settings');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [isGoogleUser, setIsGoogleUser] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const googleIdentity = user.identities?.some(id => id.provider === 'google');
                setIsGoogleUser(!!googleIdentity);
            }
        };
        checkUser();
    }, [supabase]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setStatus({ type: 'error', message: tAuth('passwordMismatch') });
            return;
        }

        setLoading(true);
        setStatus(null);

        const { error: updateError } = await supabase.auth.updateUser({
            password: password
        });

        if (updateError) {
            setStatus({ type: 'error', message: updateError.message });
        } else {
            setStatus({ type: 'success', message: tAuth('passwordUpdated') });
            setPassword('');
            setConfirmPassword('');
        }
        setLoading(false);
    };

    return (
        <div className="card space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-3">
                <div className="space-y-1 text-center sm:text-left">
                    <div className="flex items-center gap-3 text-indigo-400 justify-center sm:justify-start">
                        <Lock size={20} />
                        <span className="font-bold uppercase tracking-widest text-[10px]">{tAuth('resetPassword')}</span>
                    </div>
                    <p className="text-xs text-[var(--foreground-40)]">
                        {isGoogleUser ? tAuth('googleUserSetupPassword') : 'Set a new password for your account.'}
                    </p>
                </div>

                {isGoogleUser && (
                    <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center gap-3">
                        <UserPlus size={16} className="text-indigo-400" />
                        <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest">
                            Enable Email Login
                        </p>
                    </div>
                )}
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
                <div className="space-y-4">
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--foreground-40)]" size={18} />
                        <input
                            type="password"
                            placeholder={tAuth('newPasswordPlaceholder')}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-[var(--foreground-10)] border border-[var(--card-border)] rounded-xl py-3 pl-12 pr-4 text-[rgb(var(--foreground-rgb))] focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-sm font-medium"
                            required
                            minLength={6}
                        />
                    </div>

                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--foreground-40)]" size={18} />
                        <input
                            type="password"
                            placeholder={tAuth('confirmPasswordPlaceholder')}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-[var(--foreground-10)] border border-[var(--card-border)] rounded-xl py-3 pl-12 pr-4 text-[rgb(var(--foreground-rgb))] focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-sm font-medium"
                            required
                            minLength={6}
                        />
                    </div>
                </div>

                {status && (
                    <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-in zoom-in duration-300 ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                        {status.type === 'success' && <CheckCircle size={14} />}
                        {status.message}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading || !password}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-500 hover:bg-indigo-600 disabled:bg-[var(--foreground-10)] disabled:text-[var(--foreground-20)] text-white rounded-xl transition-all text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 disabled:shadow-none"
                >
                    {loading ? <Loader2 className="animate-spin" size={16} /> : (
                        <>
                            <Save size={16} />
                            {tAuth('updatePassword')}
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
