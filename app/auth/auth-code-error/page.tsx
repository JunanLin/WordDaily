'use client';

import { motion } from 'framer-motion';
import { XCircle, ArrowLeft, RefreshCcw } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';

export default function AuthCodeErrorPage() {
    const t = useTranslations('auth');
    const searchParams = useSearchParams();
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6">
            <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-20 h-20 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mb-8"
            >
                <XCircle size={40} />
            </motion.div>

            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="space-y-4"
            >
                <h1 className="text-4xl font-black font-outfit text-white">{t('authErrorTitle') || 'Authentication Error'}</h1>
                <p className="text-white/40 max-w-xs mx-auto">
                    {errorDescription || error || t('authErrorDesc') || 'Something went wrong during the authentication process. This often happens if the link has expired or was used in a different browser.'}
                </p>

                <div className="pt-8 flex flex-col gap-4">
                    <Link
                        href="/login"
                        className="btn-primary inline-flex items-center justify-center gap-2 px-8 py-4 group"
                    >
                        <RefreshCcw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
                        {t('backToLogin') || 'Try Signing In Again'}
                    </Link>

                    <Link
                        href="/"
                        className="text-white/40 hover:text-white/60 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <ArrowLeft size={16} />
                        {t('backToHome') || 'Back to Home'}
                    </Link>
                </div>
            </motion.div>

            {error && (
                <div className="mt-12 p-4 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-[10px] uppercase tracking-widest text-white/20 font-bold mb-1">Error Code</p>
                    <code className="text-xs text-red-400/60 font-mono">{error}</code>
                </div>
            )}
        </div>
    );
}
