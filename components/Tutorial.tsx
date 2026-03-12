'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    BookOpen,
    TrendingUp,
    Settings,
    ChevronRight,
    ChevronLeft,
    CheckCircle2,
    Sparkles,
    Volume2,
    Plus,
    Shuffle
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { markTutorialComplete } from '@/lib/actions/tutorial';
import { useRouter } from 'next/navigation';

const steps = [
    {
        id: 'welcome',
        icon: Sparkles,
        color: 'text-yellow-400',
        bg: 'bg-yellow-400/10',
        border: 'border-yellow-400/20'
    },
    {
        id: 'search',
        icon: Search,
        color: 'text-indigo-400',
        bg: 'bg-indigo-400/10',
        border: 'border-indigo-400/20'
    },
    {
        id: 'history',
        icon: BookOpen,
        color: 'text-emerald-400',
        bg: 'bg-emerald-400/10',
        border: 'border-emerald-400/20'
    },
    {
        id: 'review',
        icon: TrendingUp,
        color: 'text-purple-400',
        bg: 'bg-purple-400/10',
        border: 'border-purple-400/20'
    },
    {
        id: 'lists',
        icon: Plus,
        color: 'text-amber-400',
        bg: 'bg-amber-400/10',
        border: 'border-amber-400/20'
    },
    {
        id: 'settings',
        icon: Settings,
        color: 'text-blue-400',
        bg: 'bg-blue-400/10',
        border: 'border-blue-400/20'
    }
];

export default function Tutorial() {
    const t = useTranslations('tutorial');
    const [currentStep, setCurrentStep] = useState(0);
    const [isCompleting, setIsCompleting] = useState(false);
    const router = useRouter();

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleComplete();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleComplete = async () => {
        setIsCompleting(true);
        try {
            await markTutorialComplete();
            router.push('/');
            router.refresh();
        } catch (error) {
            console.error(error);
            setIsCompleting(false);
        }
    };

    const step = steps[currentStep];
    const Icon = step.icon;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[var(--background-end-rgb)]/90 backdrop-blur-md">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />
            </div>

            <motion.div
                layout
                className="relative w-full max-w-lg bg-[var(--modal-bg)] border border-[var(--card-border)] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col min-h-[500px]"
            >
                {/* Progress Bar */}
                <div className="absolute top-0 left-0 right-0 h-1.5 flex gap-1 p-1">
                    {steps.map((_, i) => (
                        <div
                            key={i}
                            className={cn(
                                "flex-1 h-full rounded-full transition-all duration-500",
                                i <= currentStep ? "bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" : "bg-[var(--foreground-10)]"
                            )}
                        />
                    ))}
                </div>

                <div className="p-8 flex-1 flex flex-col items-center text-center justify-center space-y-8">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, scale: 0.8, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: -20 }}
                            transition={{ type: "spring", damping: 20, stiffness: 100 }}
                            className="space-y-8 w-full"
                        >
                            <div className={cn("inline-flex p-6 rounded-[2rem] border", step.bg, step.border, step.color)}>
                                <Icon size={48} />
                            </div>

                            <div className="space-y-3">
                                <h1 className="text-3xl font-black font-outfit tracking-tight">
                                    {t(`${step.id}Title`)}
                                </h1>
                                <p className="text-[var(--foreground-40)] leading-relaxed text-sm max-w-[280px] mx-auto">
                                    {t(`${step.id}Desc`)}
                                </p>
                            </div>

                            {/* Visual Aid for Search (Step 1) */}
                            {step.id === 'search' && (
                                <div className="p-4 rounded-2xl bg-[var(--foreground-10)] border border-[var(--card-border)] space-y-3 text-left animate-pulse">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                            <Plus size={16} />
                                        </div>
                                        <div className="h-4 w-32 bg-[var(--foreground-20)] rounded-full" />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="h-2 w-full bg-[var(--foreground-10)] rounded-full" />
                                        <div className="h-2 w-2/3 bg-[var(--foreground-10)] rounded-full" />
                                    </div>
                                </div>
                            )}

                            {/* Visual Aid for Review (Step 3) */}
                            {step.id === 'review' && (
                                <div className="flex gap-2 justify-center">
                                    {[0, 2, 5, 8, 10].map(s => (
                                        <div key={s} className="w-10 h-10 rounded-xl bg-[var(--foreground-10)] border border-[var(--card-border)] flex items-center justify-center text-[0.625rem] font-black text-[var(--foreground-40)]">
                                            {s}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Visual Aid for Lists (Step 4) */}
                            {step.id === 'lists' && (
                                <div className="flex gap-3 justify-center">
                                    <div className="p-4 bg-[var(--foreground-10)] rounded-2xl border border-[var(--card-border)] scale-90 animate-pulse">
                                        <Shuffle size={24} className="text-amber-400" />
                                    </div>
                                    <div className="p-4 bg-amber-400/20 rounded-2xl border border-amber-400/20 scale-100">
                                        <Plus size={24} className="text-amber-400" />
                                    </div>
                                    <div className="p-4 bg-[var(--foreground-10)] rounded-2xl border border-[var(--card-border)] scale-90 opacity-50">
                                        <CheckCircle2 size={24} className="text-[var(--foreground-40)]" />
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer Controls */}
                <div className="p-8 pt-0 flex items-center justify-between">
                    <button
                        onClick={handleBack}
                        className={cn(
                            "p-4 rounded-2xl text-[var(--foreground-40)] hover:text-[rgb(var(--foreground-rgb))] hover:bg-[var(--foreground-10)] transition-all",
                            currentStep === 0 && "opacity-0 pointer-events-none"
                        )}
                    >
                        <ChevronLeft size={24} />
                    </button>

                    <button
                        onClick={handleNext}
                        disabled={isCompleting}
                        className="group flex items-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 px-8 rounded-2xl shadow-xl shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {isCompleting ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                {currentStep === steps.length - 1 ? t('getStarted') : t('next')}
                                {currentStep === steps.length - 1 ? <CheckCircle2 size={20} /> : <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />}
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
