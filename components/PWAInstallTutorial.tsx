'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Monitor, Smartphone, CheckCircle, Chrome, SmartphoneIcon, Info, Laptop, Tablet } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface PWAInstallTutorialProps {
    onClose: () => void;
}

export default function PWAInstallTutorial({ onClose }: PWAInstallTutorialProps) {
    const t = useTranslations('tutorial');
    const [platform, setPlatform] = useState<'safari' | 'chrome'>('safari');
    const [subPlatform, setSubPlatform] = useState<'mobile' | 'desktop' | 'tablet'>('mobile');

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
                className="relative w-full max-w-xl bg-[var(--modal-bg)] border border-[var(--card-border)] rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
                {/* Header */}
                <div className="p-8 pb-4 text-center space-y-2">
                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center gap-3 mb-4 mx-auto w-fit">
                        <Info className="text-amber-500 shrink-0" size={18} />
                        <p className="text-[0.625rem] text-amber-200/80 font-black uppercase tracking-[0.2em]">{t('pwaRecommend')}</p>
                    </div>

                    <h2 className="text-3xl font-black font-outfit tracking-tight text-[rgb(var(--foreground-rgb))]">{t('pwaTitle')}</h2>
                    <p className="text-[var(--foreground-40)] text-sm max-w-sm mx-auto">{t('pwaDesc')}</p>
                </div>

                {/* Platform Selector */}
                <div className="px-8 flex gap-4 mb-4">
                    <button
                        onClick={() => { setPlatform('safari'); setSubPlatform('mobile'); }}
                        className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl border transition-all ${platform === 'safari'
                                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                                : 'bg-[var(--foreground-10)] border-[var(--card-border)] text-[var(--foreground-20)] hover:text-[var(--foreground-40)]'
                            }`}
                    >
                        <Smartphone size={20} />
                        <span className="text-[0.625rem] font-black uppercase tracking-widest">{t('pwaPlatformSafari')}</span>
                    </button>
                    <button
                        onClick={() => { setPlatform('chrome'); setSubPlatform('mobile'); }}
                        className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl border transition-all ${platform === 'chrome'
                                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                                : 'bg-[var(--foreground-10)] border-[var(--card-border)] text-[var(--foreground-20)] hover:text-[var(--foreground-40)]'
                            }`}
                    >
                        <Chrome size={20} />
                        <span className="text-[0.625rem] font-black uppercase tracking-widest">{t('pwaPlatformChrome')}</span>
                    </button>
                </div>

                {/* Sub-Platform Selector */}
                <div className="px-8 flex gap-2 mb-6">
                    <button
                        onClick={() => setSubPlatform('mobile')}
                        className={`flex-1 py-2 rounded-xl text-[0.5625rem] font-black uppercase tracking-widest transition-all ${subPlatform === 'mobile'
                                ? 'bg-[var(--foreground-20)] text-[rgb(var(--foreground-rgb))] border border-[var(--card-border)]'
                                : 'text-[var(--foreground-20)] hover:text-[var(--foreground-40)]'
                            }`}
                    >
                        {t('pwaPlatformIPhone')}
                    </button>
                    {platform === 'chrome' && (
                        <button
                            onClick={() => setSubPlatform('tablet')}
                            className={`flex-1 py-2 rounded-xl text-[0.5625rem] font-black uppercase tracking-widest transition-all ${subPlatform === 'tablet'
                                    ? 'bg-[var(--foreground-20)] text-[rgb(var(--foreground-rgb))] border border-[var(--card-border)]'
                                    : 'text-[var(--foreground-20)] hover:text-[var(--foreground-40)]'
                                }`}
                        >
                            {t('pwaPlatformIPad')}
                        </button>
                    )}
                    <button
                        onClick={() => setSubPlatform('desktop')}
                        className={`flex-1 py-2 rounded-xl text-[0.5625rem] font-black uppercase tracking-widest transition-all ${subPlatform === 'desktop'
                                ? 'bg-[var(--foreground-20)] text-[rgb(var(--foreground-rgb))] border border-[var(--card-border)]'
                                : 'text-[var(--foreground-20)] hover:text-[var(--foreground-40)]'
                            }`}
                    >
                        {platform === 'safari' ? t('pwaPlatformIPad') : t('pwaPlatformDesktop')}
                    </button>
                </div>

                {/* Dynamic Content - Scrollable */}
                <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-1">
                    <div className="bg-[var(--foreground-10)] rounded-3xl p-6 border border-[var(--card-border)] space-y-6">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={`${platform}-${subPlatform}`}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-6"
                            >
                                <h3 className="font-bold text-lg flex items-center gap-3">
                                    {platform === 'safari' ? (
                                        subPlatform === 'mobile' ? <SmartphoneIcon className="text-indigo-400" size={20} /> : <Tablet className="text-indigo-400" size={20} />
                                    ) : (
                                        subPlatform === 'mobile' ? <SmartphoneIcon className="text-indigo-400" size={20} /> : subPlatform === 'tablet' ? <Tablet className="text-indigo-400" size={20} /> : <Laptop className="text-indigo-400" size={20} />
                                    )}
                                    {platform === 'safari'
                                        ? (subPlatform === 'mobile' ? t('pwaSafariIPhoneTitle') : t('pwaSafariIPadTitle'))
                                        : (subPlatform === 'mobile' ? t('pwaChromeAndroidTitle') : subPlatform === 'tablet' ? t('pwaChromeIPadTitle') : t('pwaChromePCTitle'))
                                    }
                                </h3>

                                <div className="space-y-4">
                                    {/* Safari Mobile Steps (iPhone) */}
                                    {platform === 'safari' && subPlatform === 'mobile' && (
                                        <>
                                            <div className="flex gap-4 items-start">
                                                <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20 text-indigo-400 text-xs font-bold">1</div>
                                                <p className="text-sm text-[var(--foreground-60)] leading-relaxed font-medium">{t('pwaSafariIPhoneStep1')}</p>
                                            </div>
                                            <div className="flex gap-4 items-start">
                                                <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20 text-indigo-400 text-xs font-bold">2</div>
                                                <p className="text-sm text-[var(--foreground-60)] leading-relaxed font-medium">{t('pwaSafariIPhoneStep2')}</p>
                                            </div>
                                            <div className="flex gap-4 items-start">
                                                <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20 text-indigo-400 text-xs font-bold">3</div>
                                                <p className="text-sm text-[var(--foreground-60)] leading-relaxed font-medium">{t('pwaSafariIPhoneStep3')}</p>
                                            </div>
                                        </>
                                    )}

                                    {/* Safari Tablet Steps (iPad) */}
                                    {platform === 'safari' && subPlatform === 'desktop' && (
                                        <>
                                            <div className="flex gap-4 items-start">
                                                <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20 text-indigo-400 text-xs font-bold">1</div>
                                                <p className="text-sm text-[var(--foreground-60)] leading-relaxed font-medium">{t('pwaSafariIPadStep1')}</p>
                                            </div>
                                            <div className="flex gap-4 items-start">
                                                <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20 text-indigo-400 text-xs font-bold">2</div>
                                                <p className="text-sm text-[var(--foreground-60)] leading-relaxed font-medium">{t('pwaSafariIPadStep2')}</p>
                                            </div>
                                        </>
                                    )}

                                    {/* Chrome Mobile Steps (Android) */}
                                    {platform === 'chrome' && subPlatform === 'mobile' && (
                                        <>
                                            <div className="flex gap-4 items-start">
                                                <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20 text-indigo-400 text-xs font-bold">1</div>
                                                <p className="text-sm text-[var(--foreground-60)] leading-relaxed font-medium">{t('pwaChromeAndroidStep1')}</p>
                                            </div>
                                            <div className="flex gap-4 items-start">
                                                <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20 text-indigo-400 text-xs font-bold">2</div>
                                                <p className="text-sm text-[var(--foreground-60)] leading-relaxed font-medium">{t('pwaChromeAndroidStep2')}</p>
                                            </div>
                                        </>
                                    )}

                                    {/* Chrome Tablet Steps (iPad) */}
                                    {platform === 'chrome' && subPlatform === 'tablet' && (
                                        <>
                                            <div className="flex gap-4 items-start">
                                                <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20 text-indigo-400 text-xs font-bold">1</div>
                                                <p className="text-sm text-[var(--foreground-60)] leading-relaxed font-medium">{t('pwaChromeIPadStep1')}</p>
                                            </div>
                                            <div className="flex gap-4 items-start">
                                                <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20 text-indigo-400 text-xs font-bold">2</div>
                                                <p className="text-sm text-[var(--foreground-60)] leading-relaxed font-medium">{t('pwaChromeIPadStep2')}</p>
                                            </div>
                                        </>
                                    )}

                                    {/* Chrome Desktop Steps (PC) */}
                                    {platform === 'chrome' && subPlatform === 'desktop' && (
                                        <>
                                            <div className="flex gap-4 items-start">
                                                <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20 text-indigo-400 text-xs font-bold">1</div>
                                                <p className="text-sm text-[var(--foreground-60)] leading-relaxed font-medium">{t('pwaChromePCStep1')}</p>
                                            </div>
                                            <div className="flex gap-4 items-start">
                                                <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20 text-indigo-400 text-xs font-bold">2</div>
                                                <p className="text-sm text-[var(--foreground-60)] leading-relaxed font-medium">{t('pwaChromePCStep2')}</p>
                                            </div>
                                        </>
                                    )}

                                    {(platform === 'safari' || (platform === 'chrome' && subPlatform === 'tablet')) && (
                                        <div className="flex gap-4 items-start">
                                            <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20 text-indigo-400 text-xs font-bold">3</div>
                                            <p className="text-sm text-[var(--foreground-60)] leading-relaxed font-medium">{t('pwaSafariStep3')}</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </AnimatePresence>
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
