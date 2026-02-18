'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share, Download, Monitor, Smartphone, CheckCircle, Chrome, SmartphoneIcon, Info } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface PWAInstallTutorialProps {
    onClose: () => void;
}

export default function PWAInstallTutorial({ onClose }: PWAInstallTutorialProps) {
    const t = useTranslations('tutorial');
    const [platform, setPlatform] = useState<'safari' | 'chrome'>('safari');

    const handleClose = () => {
        localStorage.setItem('pwa_tutorial_shown', 'true');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-xl bg-[#121218] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
                {/* Header */}
                <div className="p-8 pb-4 text-center space-y-2">
                    <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto text-indigo-400 mb-4">
                        <Download size={32} />
                    </div>
                    <h2 className="text-3xl font-black font-outfit tracking-tight text-white">{t('pwaTitle')}</h2>
                    <p className="text-white/40 text-sm max-w-sm mx-auto">{t('pwaDesc')}</p>
                </div>

                {/* Platform Selector */}
                <div className="px-8 flex gap-4 mb-6">
                    <button
                        onClick={() => setPlatform('safari')}
                        className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl border transition-all ${platform === 'safari'
                                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                                : 'bg-white/5 border-white/5 text-white/20 hover:text-white/40'
                            }`}
                    >
                        <Smartphone size={24} />
                        <span className="text-[10px] font-black uppercase tracking-widest">iOS (Safari)</span>
                    </button>
                    <button
                        onClick={() => setPlatform('chrome')}
                        className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl border transition-all ${platform === 'chrome'
                                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                                : 'bg-white/5 border-white/5 text-white/20 hover:text-white/40'
                            }`}
                    >
                        <Chrome size={24} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Android/Desktop</span>
                    </button>
                </div>

                {/* Dynamic Content - Scrollable */}
                <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-6">
                    <div className="bg-white/5 rounded-3xl p-6 border border-white/5 space-y-6">
                        {platform === 'safari' ? (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <h3 className="font-bold text-lg flex items-center gap-3">
                                    <SmartphoneIcon className="text-indigo-400" size={20} />
                                    {t('pwaSafariTitle')}
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex gap-4 items-start">
                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 border border-white/10">1</div>
                                        <p className="text-sm text-white/60 leading-relaxed font-medium">{t('pwaSafariStep1')}</p>
                                    </div>
                                    <div className="flex gap-4 items-start">
                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 border border-white/10">2</div>
                                        <p className="text-sm text-white/60 leading-relaxed font-medium">{t('pwaSafariStep2')}</p>
                                    </div>
                                    <div className="flex gap-4 items-start">
                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 border border-white/10">3</div>
                                        <p className="text-sm text-white/60 leading-relaxed font-medium">{t('pwaSafariStep3')}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                                <h3 className="font-bold text-lg flex items-center gap-3">
                                    <Monitor className="text-indigo-400" size={20} />
                                    {t('pwaChromeTitle')}
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex gap-4 items-start">
                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 border border-white/10">1</div>
                                        <p className="text-sm text-white/60 leading-relaxed font-medium">{t('pwaChromeStep1')}</p>
                                    </div>
                                    <div className="flex gap-4 items-start">
                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 border border-white/10">2</div>
                                        <p className="text-sm text-white/60 leading-relaxed font-medium">{t('pwaChromeStep2')}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3">
                        <Info className="text-amber-500 shrink-0" size={18} />
                        <p className="text-[10px] text-amber-200/60 font-bold uppercase tracking-widest">{t('pwaRecommend')}</p>
                    </div>
                </div>

                {/* Footer Button */}
                <div className="p-8 pt-0">
                    <button
                        onClick={handleClose}
                        className="w-full btn-primary py-5 rounded-2xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3"
                    >
                        <CheckCircle size={20} />
                        {t('pwaClose')}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
