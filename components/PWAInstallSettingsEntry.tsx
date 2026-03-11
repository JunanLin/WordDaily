'use client';

import { useState } from 'react';
import { Download, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import PWAInstallTutorial from './PWAInstallTutorial';
import { AnimatePresence } from 'framer-motion';

export default function PWAInstallSettingsEntry() {
    const t = useTranslations('tutorial');
    const [show, setShow] = useState(false);

    return (
        <>
            <button
                onClick={() => setShow(true)}
                className="card w-full block hover:bg-[var(--foreground-10)] transition-colors border-[var(--card-border)] text-left"
            >
                <div className="flex items-center justify-between py-4 px-2 group">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 shadow-inner">
                            <Download size={24} />
                        </div>
                        <div>
                            <p className="font-bold text-lg text-[rgb(var(--foreground-rgb))]">{t('viewPwaTutorial')}</p>
                            <p className="text-xs text-[var(--foreground-40)] font-medium">{t('pwaTitle')}</p>
                        </div>
                    </div>
                    <div className="text-[var(--foreground-20)] group-hover:text-[var(--foreground-40)] group-hover:translate-x-1 transition-all">
                        <ArrowRight size={20} />
                    </div>
                </div>
            </button>

            <AnimatePresence>
                {show && <PWAInstallTutorial onClose={() => setShow(false)} />}
            </AnimatePresence>
        </>
    );
}
