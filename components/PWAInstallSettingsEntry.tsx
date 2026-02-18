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
                className="card w-full block hover:bg-white/[0.03] transition-colors border-white/5 text-left"
            >
                <div className="flex items-center justify-between py-4 px-2 group">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 shadow-inner">
                            <Download size={24} />
                        </div>
                        <div>
                            <p className="font-bold text-lg">{t('viewPwaTutorial')}</p>
                            <p className="text-xs text-white/30 font-medium">{t('pwaTitle')}</p>
                        </div>
                    </div>
                    <div className="text-white/20 group-hover:text-white/40 group-hover:translate-x-1 transition-all">
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
