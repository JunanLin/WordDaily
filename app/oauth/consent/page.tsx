'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Shield, ArrowLeft, ArrowRight, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import PasswordChangeForm from '@/components/PasswordChangeForm';
import Link from 'next/link';

export default function OAuthConsentPage() {
    const tAuth = useTranslations('auth');
    const tSettings = useTranslations('settings');
    const [isGoogleUser, setIsGoogleUser] = useState(false);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const googleIdentity = user.identities?.some(id => id.provider === 'google');
                setIsGoogleUser(!!googleIdentity);
                setUserEmail(user.email ?? null);
            }
        };
        checkUser();
    }, [supabase]);

    return (
        <div className="flex flex-col min-h-screen max-w-2xl mx-auto p-6 space-y-8 pb-32">
            {/* Header */}
            <div className="flex items-center justify-between pt-4">
                <Link
                    href="/settings"
                    className="flex items-center gap-2 text-[var(--foreground-40)] hover:text-[rgb(var(--foreground-rgb))] transition-colors font-bold text-sm uppercase tracking-widest group"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    {tSettings('title')}
                </Link>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-3 text-indigo-400">
                        <Shield size={24} />
                        <span className="font-black uppercase tracking-[0.2em] text-xs">{tAuth('securityAndIdentity')}</span>
                    </div>
                    <h1 className="text-4xl font-black font-outfit tracking-tight">{tAuth('manageAccount')}</h1>
                    <p className="text-[var(--foreground-40)] font-medium">{tAuth('manageAccountDesc')}</p>
                </div>

                {/* Identity Card */}
                <div className="card bg-[var(--foreground-10)] border-[var(--card-border)] p-8 flex flex-col sm:flex-row items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black text-2xl shadow-xl shadow-indigo-500/20 text-white">
                        {userEmail?.[0]?.toUpperCase()}
                    </div>
                    <div className="text-center sm:text-left space-y-1">
                        <p className="text-xl font-bold tracking-tight">{userEmail}</p>
                        <div className="flex items-center justify-center sm:justify-start gap-2">
                            {isGoogleUser ? (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[0.625rem] font-black uppercase tracking-widest">
                                    <div className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" />
                                    {tAuth('googleAccount')}
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full text-[0.625rem] font-black uppercase tracking-widest">
                                    {tAuth('emailAccount')}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="h-px w-full bg-[var(--card-border)] my-4" />

                {/* Password Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3 px-1 text-[var(--foreground-20)]">
                        <span className="text-[0.625rem] font-black uppercase tracking-[0.2em]">{tSettings('security')}</span>
                    </div>
                    <PasswordChangeForm />
                </div>
            </div>

            <footer className="pt-12 text-center">
                <p className="text-[0.625rem] text-[var(--foreground-20)] uppercase font-bold tracking-[0.2em]">{tAuth('securedBy')}</p>
            </footer>
        </div>
    );
}
