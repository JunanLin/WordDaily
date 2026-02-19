'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function VerifiedPage() {
    const t = useTranslations('auth');

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6">
            <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-8"
            >
                <CheckCircle2 size={40} />
            </motion.div>

            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="space-y-4"
            >
                <h1 className="text-4xl font-black font-outfit">{t('emailVerifiedTitle')}</h1>
                <p className="text-white/40 max-w-xs mx-auto">
                    {t('emailVerifiedDesc')}
                </p>

                <div className="pt-8">
                    <Link
                        href="/"
                        className="btn-primary inline-flex items-center gap-2 px-8 py-4 group"
                    >
                        {t('goToDashboard')}
                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}
