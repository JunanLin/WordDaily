'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Mail, Lock, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function LoginPage() {
    const t = useTranslations('auth');
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get('next') || searchParams.get('redirect') || '/';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();
    const router = useRouter();

    const handleGoogleSignIn = async () => {
        setLoading(true);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
            },
        });
        if (error) {
            setError(error.message);
            setLoading(false);
        }
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error: authError } = isSignUp
            ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } })
            : await supabase.auth.signInWithPassword({ email, password });

        if (authError) {
            if (authError.message.includes('Email not confirmed')) {
                setError(t('checkEmail'));
            } else if (authError.message.includes('Invalid login credentials')) {
                setError(t('invalidCredentials'));
            } else {
                setError(authError.message);
            }
            setLoading(false);
        } else {
            router.push(redirectTo);
            router.refresh();
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen max-w-sm mx-auto p-6 space-y-8">
            {/* Language Switcher */}
            <div className="w-full flex justify-end">
                <LanguageSwitcher />
            </div>

            <div className="text-center space-y-2">
                <h2 className="text-4xl font-black font-outfit bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    {isSignUp ? t('join') : t('welcomeBack')}
                </h2>
                <p className="text-[var(--foreground-40)] font-medium">{t('subtitle')}</p>
            </div>

            {/* Tabs */}
            <div className="flex w-full bg-[var(--foreground-10)] p-1 rounded-2xl border border-[var(--card-border)]">
                <button
                    onClick={() => setIsSignUp(false)}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${!isSignUp ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-[var(--foreground-40)] hover:text-[var(--foreground-60)]'}`}
                >
                    {t('signIn')}
                </button>
                <button
                    onClick={() => setIsSignUp(true)}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${isSignUp ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-[var(--foreground-40)] hover:text-[var(--foreground-60)]'}`}
                >
                    {t('createAccount')}
                </button>
            </div>

            <form onSubmit={handleAuth} className="w-full space-y-4">
                <div className="space-y-4">
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--foreground-40)]" size={20} />
                        <input
                            type="email"
                            placeholder={t('emailPlaceholder')}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-[var(--foreground-10)] border border-[var(--card-border)] rounded-2xl py-4 pl-12 pr-4 text-[rgb(var(--foreground-rgb))] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-[var(--foreground-40)]"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--foreground-40)]" size={20} />
                            <input
                                type="password"
                                placeholder={t('passwordPlaceholder')}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[var(--foreground-10)] border border-[var(--card-border)] rounded-2xl py-4 pl-12 pr-4 text-[rgb(var(--foreground-rgb))] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-[var(--foreground-40)]"
                                required
                            />
                        </div>
                        {!isSignUp && (
                            <div className="flex justify-end px-1">
                                <Link
                                    href="/forgot-password"
                                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                                >
                                    {t('forgotPassword')}
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                {error && (
                    <p className="text-red-400 text-sm text-center bg-red-400/10 py-3 rounded-xl border border-red-400/20 px-4">
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full flex items-center justify-center gap-2 py-4 shadow-xl shadow-indigo-500/20"
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : (isSignUp ? t('createAccount') : t('signIn'))}
                    {!loading && <ArrowRight size={20} />}
                </button>
            </form>

            <div className="w-full flex items-center gap-4 py-2">
                <div className="h-px flex-1 bg-[var(--card-border)]" />
                <span className="text-[10px] text-[var(--foreground-20)] font-bold uppercase tracking-widest">or</span>
                <div className="h-px flex-1 bg-[var(--card-border)]" />
            </div>

            <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-4 bg-[var(--foreground-10)] border border-[var(--card-border)] rounded-2xl text-[rgb(var(--foreground-rgb))] font-bold hover:bg-[var(--foreground-20)] transition-all active:scale-[0.98]"
            >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {t('signInWithGoogle')}
            </button>

            <div className="pt-8 text-center">
                <p className="text-[10px] text-[var(--foreground-20)] uppercase font-bold tracking-widest">
                    {t('securedBy')}
                </p>
            </div>
        </div>
    );
}
