'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, ChevronRight, CheckCircle2, Loader2 } from 'lucide-react';
import { submitReview } from '@/lib/actions/review';
import confetti from 'canvas-confetti';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface Example {
    example_en: string;
    example_zh: string;
}

interface WordDefinition {
    part_of_speech: string;
    definition_text_zh: string;
    definition_text_en: string;
    examples: Example[];
}

interface ReviewWord {
    id: string;
    words: {
        word: string;
        phonetic_ipa?: string;
        pronunciation_audio_url?: string;
        definitions: WordDefinition[];
        general_examples?: Example[];
    };
}

interface ReviewSessionClientProps {
    words: ReviewWord[];
}

const getPOSColor = (pos: string) => {
    const p = pos ? pos.toLowerCase() : '';
    if (p.includes('noun')) return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    if (p.includes('verb')) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    if (p.includes('adj')) return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    if (p.includes('adv')) return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
};

export default function ReviewSessionClient({ words }: ReviewSessionClientProps) {
    const t = useTranslations('review');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [step, setStep] = useState<'STUDY' | 'REVEAL' | 'SCORE'>('STUDY');
    const [score, setScore] = useState(10);
    const [loading, setLoading] = useState(false);
    const [finished, setFinished] = useState(false);
    const [isMeaningsExpanded, setIsMeaningsExpanded] = useState(false);
    const router = useRouter();

    const currentWord = words[currentIndex];
    const total = words.length;

    // Safety check for empty session or finished session
    if (words.length === 0 && !finished) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center text-green-500">
                    <CheckCircle2 size={40} />
                </div>
                <h2 className="text-2xl font-bold">{t('allCaughtUp')}</h2>
                <p className="text-white/40">{t('noWordsDue')}</p>
            </div>
        );
    }

    if (finished) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-4 text-center">
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-indigo-500/20 p-6 rounded-full text-indigo-400 mb-4"
                >
                    <CheckCircle2 size={48} />
                </motion.div>
                <h2 className="text-3xl font-bold font-outfit">{t('sessionComplete')}</h2>
                <p className="text-white/40">{t('mastered')}</p>
                <button
                    onClick={() => router.push('/')}
                    className="btn-primary mt-4"
                >
                    {t('backToDashboard')}
                </button>
            </div>
        );
    }


    const handleSubmit = async () => {
        setLoading(true);
        try {
            await submitReview(currentWord.id, score, 'EN_TO_CN');

            if (currentIndex + 1 < total) {
                setCurrentIndex(currentIndex + 1);
                setStep('STUDY');
                setScore(10);
                setIsMeaningsExpanded(false);
            } else {
                setFinished(true);
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 }
                });
                // setTimeout(() => router.push('/'), 2500);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const playAudio = () => {
        if (currentWord.words.pronunciation_audio_url) {
            console.log(`[Audio] Playing: ${currentWord.words.pronunciation_audio_url}`);
            const audio = new Audio(currentWord.words.pronunciation_audio_url);
            audio.play().catch(e => {
                console.error('[Audio] Playback failed:', e);
                alert('Audio playback failed. The source file might be missing or blocked by your browser.');
            });
        } else {
            console.warn('[Audio] No audio URL found for this word.');
            alert('No pronunciation audio available for this word.');
        }
    };

    return (
        <div className="flex flex-col h-full min-h-[70vh] items-center justify-center space-y-8">
            {/* Progress */}
            <div className="w-full flex justify-between items-center text-xs font-bold text-white/30 uppercase tracking-widest px-2">
                <span>{t('sessionProgress')}</span>
                <span>{currentIndex + 1} / {total}</span>
            </div>

            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                    className="h-full bg-indigo-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentIndex + 1) / total) * 100}%` }}
                />
            </div>

            {/* Card Section */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={`${currentIndex}-${step}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.2 }}
                    className="w-full"
                >
                    <div className="card w-full min-h-[350px] flex flex-col items-center justify-center text-center p-8 space-y-6 relative overflow-hidden ring-1 ring-white/10 shadow-2xl">
                        {/* Background Decorative Element */}
                        <div className="absolute -top-10 -right-10 opacity-5 blur-2xl">
                            <div className="w-40 h-40 bg-indigo-500 rounded-full" />
                        </div>

                        {step === 'STUDY' && (
                            <div className="space-y-8">
                                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em]">{t('englishOrigin')}</span>
                                <div className="space-y-4">
                                    <h2 className="text-6xl font-black font-outfit tracking-tight">{currentWord.words.word}</h2>
                                    <p className="text-white/20 font-mono text-sm tracking-widest">{currentWord.words.phonetic_ipa || '/.../'}</p>
                                </div>
                                <button onClick={playAudio} className="p-5 bg-indigo-500/10 rounded-full hover:bg-indigo-500/20 text-indigo-400 transition-all active:scale-95">
                                    <Volume2 size={32} />
                                </button>
                            </div>
                        )}

                        {step === 'REVEAL' && (
                            <div className="space-y-8 w-full">
                                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-[0.2em]">{t('meaningUsage')}</span>
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-center gap-3">
                                            <h2 className="text-3xl font-bold font-outfit">{currentWord.words.word}</h2>
                                            <button onClick={playAudio} className="p-2 bg-purple-500/10 rounded-full hover:bg-purple-500/20 text-purple-400 transition-all active:scale-95">
                                                <Volume2 size={18} />
                                            </button>
                                        </div>
                                        <div className="h-px bg-white/5 w-1/4 mx-auto" />
                                    </div>
                                    <div className="space-y-4 w-full text-left max-h-[400px] overflow-y-auto pr-2 scrollbar-none">
                                        {(isMeaningsExpanded ? currentWord.words.definitions : currentWord.words.definitions.slice(0, 3)).map((m, i) => (
                                            <div key={i} className="space-y-1 p-3 rounded-xl bg-white/5 border border-white/5">
                                                <div className="flex items-center gap-2">
                                                    <span className={cn("text-[10px] font-bold uppercase py-0.5 px-1.5 rounded border", getPOSColor(m.part_of_speech))}>
                                                        {m.part_of_speech || 'N/A'}
                                                    </span>
                                                    <p className="text-xl font-bold text-white/90">{m.definition_text_zh}</p>
                                                </div>
                                                <p className="text-xs text-white/40 italic leading-tight pl-1">{m.definition_text_en}</p>
                                            </div>
                                        ))}
                                        {currentWord.words.definitions.length > 3 && (
                                            <button
                                                onClick={() => setIsMeaningsExpanded(!isMeaningsExpanded)}
                                                className="w-full py-2 text-[10px] font-bold uppercase tracking-widest text-indigo-400/60 hover:text-indigo-400 transition-colors"
                                            >
                                                {isMeaningsExpanded ? t('showLess') : t('moreMeanings', { count: currentWord.words.definitions.length - 3 })}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 'SCORE' && (
                            <div className="space-y-8 w-full">
                                <span className="text-[10px] font-bold text-green-400 uppercase tracking-[0.2em]">{t('selfAssessment')}</span>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-center gap-3">
                                        <h3 className="text-4xl font-black font-outfit">{currentWord.words.word}</h3>
                                        <button onClick={playAudio} className="p-2 bg-green-500/10 rounded-full hover:bg-green-500/20 text-green-400 transition-all active:scale-95">
                                            <Volume2 size={20} />
                                        </button>
                                    </div>
                                    <div className="text-white/40 text-sm">{t('howEasy')}</div>
                                </div>

                                <div className="space-y-6 pt-6 bg-white/5 p-6 rounded-2xl border border-white/5">
                                    <div className="flex justify-between items-end">
                                        <div className="text-left">
                                            <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">{t('forgotten')}</div>
                                            <span className={cn("text-xl font-bold transition-colors", score < 4 ? "text-red-400" : "text-white/10")}>0</span>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">{t('score')}</div>
                                            <span className="text-4xl font-black text-white">{score}</span>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">{t('perfect')}</div>
                                            <span className={cn("text-xl font-bold transition-colors", score === 10 ? "text-green-400" : "text-white/10")}>10</span>
                                        </div>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="10"
                                        step="1"
                                        value={score}
                                        onChange={(e) => setScore(parseInt(e.target.value))}
                                        className="w-full h-3 bg-white/10 rounded-full appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
                                    />
                                </div>

                                {score <= 3 && <p className="text-xs text-red-400/60">{t('nextReviewSoon')}</p>}
                                {score >= 4 && score <= 7 && <p className="text-xs text-yellow-400/60">{t('nextReviewNormal')}</p>}
                                {score >= 8 && <p className="text-xs text-green-400/60">{t('nextReviewLater')}</p>}
                            </div>
                        )}
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Actions */}
            <div className="w-full pt-4 space-y-4">
                {step === 'STUDY' && (
                    <button
                        onClick={() => setStep('REVEAL')}
                        className="btn-primary w-full py-6 flex items-center justify-center gap-2 group"
                    >
                        {t('showTranslation')}
                        <span className="group-hover:translate-x-1 transition-transform">
                            <ChevronRight size={20} />
                        </span>
                    </button>
                )}
                {step === 'REVEAL' && (
                    <button
                        onClick={() => setStep('SCORE')}
                        className="btn-primary w-full py-6 flex items-center justify-center gap-2 group bg-gradient-to-r from-purple-600 to-indigo-600"
                    >
                        {t('rateAssessment')}
                        <CheckCircle2 size={20} className="group-hover:scale-110 transition-transform" />
                    </button>
                )}
                {step === 'SCORE' && (
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="btn-primary w-full py-6 flex items-center justify-center gap-2 group bg-gradient-to-r from-indigo-600 to-emerald-600 border-none"
                    >
                        {loading ? <Loader2 className="animate-spin" size={24} /> : (
                            <>
                                {t('nextWord')}
                                <span className="group-hover:translate-x-1 transition-transform">
                                    <ChevronRight size={24} />
                                </span>
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Examples Preview in Scores/Reveal Steps */}
            {step !== 'STUDY' && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full space-y-4 p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 shadow-inner"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                            <Volume2 size={16} />
                        </div>
                        <span className="text-xs font-bold text-indigo-300/60 uppercase tracking-[0.2em]">{t('contextualUsage')}</span>
                    </div>
                    <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 scrollbar-none">
                        {/* Per-Definition Examples */}
                        {currentWord.words.definitions.map((d, di) => (
                            d.examples && d.examples.map((ex, ei) => (
                                <div key={`def-${di}-${ei}`} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/[0.08] transition-colors">
                                    <p className="text-sm text-white/80 leading-relaxed italic">
                                        &quot;{ex.example_en}&quot;
                                    </p>
                                    <p className="text-xs text-white/40 mt-1">{ex.example_zh}</p>
                                </div>
                            ))
                        ))}

                        {/* General Word Examples */}
                        {currentWord.words.general_examples && currentWord.words.general_examples.map((ex, ei) => (
                            <div key={`gen-${ei}`} className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors">
                                <p className="text-sm text-white/80 leading-relaxed italic">
                                    &quot;{ex.example_en}&quot;
                                </p>
                                <p className="text-xs text-white/40 mt-1">{ex.example_zh}</p>
                            </div>
                        ))}

                        {/* Fallback if no examples anywhere */}
                        {!currentWord.words.definitions.some(d => d.examples && d.examples.length > 0) && (!currentWord.words.general_examples || currentWord.words.general_examples.length === 0) && (
                            <p className="text-center py-8 text-white/20 text-xs italic">{t('noExamples')}</p>
                        )}
                    </div>
                </motion.div>
            )}
        </div>
    );
}
