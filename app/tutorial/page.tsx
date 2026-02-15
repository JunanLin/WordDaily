'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusCircle, BookOpen, TrendingUp, Bell, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { markTutorialComplete } from '@/lib/actions/tutorial';

const tutorialSteps = [
    {
        icon: PlusCircle,
        color: 'from-indigo-500 to-purple-500',
        bgColor: 'bg-indigo-500/10',
        iconColor: 'text-indigo-400',
    },
    {
        icon: BookOpen,
        color: 'from-emerald-500 to-teal-500',
        bgColor: 'bg-emerald-500/10',
        iconColor: 'text-emerald-400',
    },
    {
        icon: TrendingUp,
        color: 'from-amber-500 to-orange-500',
        bgColor: 'bg-amber-500/10',
        iconColor: 'text-amber-400',
    },
    {
        icon: Bell,
        color: 'from-pink-500 to-rose-500',
        bgColor: 'bg-pink-500/10',
        iconColor: 'text-pink-400',
    },
];

export default function TutorialPage() {
    const t = useTranslations('tutorial');
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const [isCompleting, setIsCompleting] = useState(false);

    const handleComplete = async () => {
        setIsCompleting(true);
        try {
            await markTutorialComplete();
            router.push('/');
            router.refresh();
        } catch (error) {
            console.error('Failed to mark tutorial as complete:', error);
            setIsCompleting(false);
        }
    };

    const handleSkip = async () => {
        await handleComplete();
    };

    const StepIcon = tutorialSteps[currentStep].icon;

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8 pb-20">
            {/* Header */}
            <div className="text-center space-y-2">
                <h1 className="text-4xl font-black font-outfit bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                    {t('title')}
                </h1>
                <p className="text-white/40 text-sm">{t('subtitle')}</p>
            </div>

            {/* Progress Dots */}
            <div className="flex items-center gap-2">
                {tutorialSteps.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrentStep(index)}
                        className={`h-2 rounded-full transition-all ${index === currentStep
                                ? 'w-8 bg-indigo-500'
                                : index < currentStep
                                    ? 'w-2 bg-emerald-500'
                                    : 'w-2 bg-white/10'
                            }`}
                    />
                ))}
            </div>

            {/* Step Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="w-full space-y-6"
                >
                    {/* Icon */}
                    <div className="flex justify-center">
                        <div className={`p-8 rounded-3xl ${tutorialSteps[currentStep].bgColor} border border-white/5`}>
                            <StepIcon size={64} className={tutorialSteps[currentStep].iconColor} />
                        </div>
                    </div>

                    {/* Content */}
                    <div className="card space-y-4 text-center">
                        <h2 className="text-2xl font-bold font-outfit">
                            {t(`step${currentStep + 1}Title`)}
                        </h2>
                        <p className="text-white/60 leading-relaxed">
                            {t(`step${currentStep + 1}Desc`)}
                        </p>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="w-full space-y-3">
                {currentStep < tutorialSteps.length - 1 ? (
                    <>
                        <button
                            onClick={() => setCurrentStep(currentStep + 1)}
                            className="btn-primary w-full py-4 flex items-center justify-center gap-2 group"
                        >
                            Next
                            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                        {currentStep > 0 && (
                            <button
                                onClick={() => setCurrentStep(currentStep - 1)}
                                className="w-full py-4 flex items-center justify-center gap-2 text-white/40 hover:text-white/60 transition-colors"
                            >
                                <ArrowLeft size={20} />
                                Back
                            </button>
                        )}
                    </>
                ) : (
                    <button
                        onClick={handleComplete}
                        disabled={isCompleting}
                        className="btn-primary w-full py-4 flex items-center justify-center gap-2 group"
                    >
                        {isCompleting ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <>
                                <Check size={20} />
                                {t('getStarted')}
                            </>
                        )}
                    </button>
                )}

                {/* Skip Button */}
                {currentStep === 0 && (
                    <button
                        onClick={handleSkip}
                        className="w-full py-3 text-sm text-white/30 hover:text-white/50 transition-colors"
                    >
                        {t('skipTutorial')}
                    </button>
                )}
            </div>
        </div>
    );
}
