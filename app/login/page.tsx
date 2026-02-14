'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Mail, Lock, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();
    const router = useRouter();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error: authError } = isSignUp
            ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } })
            : await supabase.auth.signInWithPassword({ email, password });

        if (authError) {
            if (authError.message.includes('Email not confirmed')) {
                setError('Please check your email to confirm your account first. (You can also disable this requirement in the Supabase Dashboard under Auth Settings)');
            } else {
                setError(authError.message);
            }
            setLoading(false);
        } else {
            router.push('/');
            router.refresh();
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-8">
            <div className="text-center space-y-2">
                <h2 className="text-4xl font-bold font-outfit bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                    {isSignUp ? 'Join WordDaily' : 'Welcome Back'}
                </h2>
                <p className="text-white/40">Master one word at a time.</p>
            </div>

            <form onSubmit={handleAuth} className="w-full space-y-4">
                <div className="space-y-4">
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
                        <input
                            type="email"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-white/30"
                            required
                        />
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-white/30"
                            required
                        />
                    </div>
                </div>

                {error && (
                    <p className="text-red-400 text-sm text-center bg-red-400/10 py-2 rounded-lg border border-red-400/20">
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full flex items-center justify-center gap-2 py-4"
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : (isSignUp ? 'Create Account' : 'Sign In')}
                    {!loading && <ArrowRight size={20} />}
                </button>
            </form>

            <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-white/40 hover:text-white/60 text-sm transition-colors"
            >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>

            <div className="pt-8 text-center">
                <p className="text-[10px] text-white/20 uppercase font-bold tracking-widest">
                    Secured by Supabase Auth
                </p>
            </div>
        </div>
    );
}
