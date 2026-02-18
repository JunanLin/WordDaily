'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, ChevronRight, CheckCircle2, Loader2 } from 'lucide-react';
import { submitReview } from '@/lib/actions/review';
import confetti from 'canvas-confetti';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { formatWord } from '@/lib/utils/format';

interface Example {
    example_en: string;
    example_zh: string;
}

interface Meaning {
    part_of_speech: string;
    chinese_meaning: string;
}

interface ReviewWord {
    id: string;
    dictionary: {
        word: string;
        phonetic?: string;
        translation?: string;
        pos?: string;
        tag?: string;
        bnc?: number;
        frq?: number;
        exchange?: string;
        detail?: any;
        audio?: string;
    };
}

interface ReviewSessionClientProps {
    words: ReviewWord[];
    useCapitalCase?: boolean;
}

const getPOSColor = (pos: string) => {
    const p = pos ? pos.toLowerCase() : '';
    if (p.includes('noun') || p === 'n') return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    if (p.includes('verb') || p === 'v') return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    if (p.includes('adj') || p === 'a') return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    if (p.includes('adv') || p === 'r') return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
};

/**
 * Helper to parse ECDICT translation string into meanings array
 */
const parseMeanings = (translation: string, fallbackPos?: string) => {
    if (!translation) return [];
    // Split by actual newlines or literal \n strings
    return translation.split(/\r?\n|\\n/).map(line => {
        const match = line.match(/^([a-z]+\.)\s*(.*)/);
        if (match) return { part_of_speech: match[1].replace('.', ''), chinese_meaning: match[2].trim() };
        return { part_of_speech: fallbackPos || 'N/A', chinese_meaning: line.trim() };
    }).filter(m => m.chinese_meaning);
};

/**
 * Helper to extract examples from dictionary detail JSON
 */
const parseExamples = (detail: any) => {
    if (!detail || !detail.examples) return [];
    return detail.examples;
};

export default function ReviewSessionClient({ words: initialWords, useCapitalCase = false }: ReviewSessionClientProps) {
    const t = useTranslations('review');
    const [words] = useState(initialWords);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [step, setStep] = useState<'STUDY' | 'REVEAL' | 'SCORE'>('STUDY');
    const [score, setScore] = useState(10);
    const [loading, setLoading] = useState(false);
    const [finished, setFinished] = useState(false);
    const [isMeaningsExpanded, setIsMeaningsExpanded] = useState(false);
    const router = useRouter();

    // Reset due count in navigation when session is empty or finished
    useEffect(() => {
        if (initialWords.length === 0) {
            window.dispatchEvent(new CustomEvent('review-finished'));
        }
    }, [initialWords.length]);

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

    if (!currentWord) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                <Loader2 className="animate-spin text-indigo-500" size={40} />
                <p className="text-white/40">{t('loading') || 'Loading...'}</p>
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
                // Dispatch event to update navigation immediately
                window.dispatchEvent(new CustomEvent('review-finished'));

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

    const parseExchange = (exchange: string) => {
        if (!exchange) return [];
        const codes: Record<string, string> = {
            p: '过去式',
            d: '过去分词',
            i: '现在分词',
            '3': '第三人称单数',
            r: '比较级',
            t: '最高级',
            s: '复数',
            '0': '原型',
            '1': '变换'
        };

        return exchange.split('/').map(part => {
            const [code, val] = part.split(':');
            return {
                label: codes[code] || code,
                value: val
            };
        });
    };

    const playAudio = () => {
        if (currentWord.dictionary.audio) {
            const audio = new Audio(currentWord.dictionary.audio);
            audio.play().catch(e => {
                console.error('[Audio] Playback failed, falling back to TTS:', e);
                const utterance = new SpeechSynthesisUtterance(currentWord.dictionary.word);
                utterance.lang = 'en-US';
                window.speechSynthesis.speak(utterance);
            });
        } else if (currentWord.dictionary.word) {
            const utterance = new SpeechSynthesisUtterance(currentWord.dictionary.word);
            utterance.lang = 'en-US';
            window.speechSynthesis.speak(utterance);
        }
    };

    const getWordSizeClass = (word: string) => {
        const len = word.length;
        if (len > 20) return 'text-2xl';
        if (len > 15) return 'text-3xl';
        if (len > 10) return 'text-4xl';
        return 'text-6xl';
    };

    const getRevealWordSizeClass = (word: string) => {
        const len = word.length;
        if (len > 20) return 'text-xl';
        if (len > 15) return 'text-2xl';
        if (len > 10) return 'text-3xl';
        return 'text-4xl';
    };

    return (
        <div className="flex flex-col h-full min-h-[70vh] items-center space-y-6">
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
                    className="w-full h-[450px]"
                >
                    <div className="card w-full h-full flex flex-col items-center justify-start text-center p-8 relative overflow-y-auto ring-1 ring-white/10 shadow-2xl bg-[#121218] scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        {step === 'STUDY' && (
                            <div className="space-y-8 my-auto py-4">
                                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em]">{t('englishOrigin')}</span>
                                <div className="space-y-4">
                                    <h2 className={cn("font-black font-outfit tracking-tight break-words", getWordSizeClass(currentWord.dictionary.word))}>
                                        {formatWord(currentWord.dictionary.word, useCapitalCase)}
                                    </h2>
                                    <p className="text-white/20 font-mono text-sm tracking-widest">{currentWord.dictionary.phonetic || '/.../'}</p>
                                </div>
                                <button
                                    onClick={playAudio}
                                    className="p-5 bg-indigo-500/10 rounded-full hover:bg-indigo-500/20 text-indigo-400 transition-all active:scale-95 shadow-lg shadow-indigo-500/5 group"
                                >
                                    <Volume2 size={32} className="group-hover:scale-110 transition-transform" />
                                </button>
                            </div>
                        )}

                        {step === 'REVEAL' && (
                            <div className="space-y-6 w-full max-w-lg py-4">
                                <div className="space-y-2">
                                    <h2 className={cn("font-black font-outfit tracking-tight break-words", getRevealWordSizeClass(currentWord.dictionary.word))}>
                                        {formatWord(currentWord.dictionary.word, useCapitalCase)}
                                    </h2>
                                    <div className="flex items-center justify-center gap-3">
                                        <p className="text-white/20 font-mono text-xs tracking-widest">{currentWord.dictionary.phonetic || '/.../'}</p>
                                        <button
                                            onClick={playAudio}
                                            className="p-1.5 bg-indigo-500/10 rounded-full text-indigo-400 hover:bg-indigo-500/20 transition-colors"
                                        >
                                            <Volume2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Stats & Metadata */}
                                {(currentWord.dictionary.tag || currentWord.dictionary.pos || currentWord.dictionary.bnc || currentWord.dictionary.frq || currentWord.dictionary.exchange) && (
                                    <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-3">
                                        <div className="flex flex-wrap gap-2 justify-center">
                                            {currentWord.dictionary.tag?.split(' ').filter(Boolean).map((tag: string) => (
                                                <span key={tag} className="px-2 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-300">
                                                    {t(`tag_${tag}`)}
                                                </span>
                                            ))}
                                        </div>
                                        {currentWord.dictionary.exchange && (
                                            <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center text-[10px]">
                                                {parseExchange(currentWord.dictionary.exchange).map((ex: any, idx: number) => (
                                                    <div key={idx} className="flex gap-1.5">
                                                        <span className="text-white/20 uppercase font-black">{ex.label}</span>
                                                        <span className="text-indigo-400 font-bold">{formatWord(ex.value, useCapitalCase)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {currentWord.dictionary.pos && (
                                            <div className="pt-2 border-t border-indigo-500/10">
                                                <p className="text-[10px] text-white/40 font-bold uppercase mb-1">{t('posDistribution')}</p>
                                                <p className="text-xs text-indigo-200/80 font-mono italic">{currentWord.dictionary.pos}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="space-y-3 text-left">
                                    {parseMeanings(currentWord.dictionary.translation || '', currentWord.dictionary.pos).map((m: any, i: number) => (
                                        <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3">
                                            <span className={cn("text-[10px] font-bold uppercase py-0.5 px-1.5 rounded border", getPOSColor(m.part_of_speech))}>
                                                {m.part_of_speech || 'N/A'}
                                            </span>
                                            <p className="text-lg font-bold text-white/90">{m.chinese_meaning}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {step === 'SCORE' && (
                            <div className="space-y-8 w-full my-auto py-4">
                                <span className="text-[10px] font-bold text-green-400 uppercase tracking-[0.2em]">{t('selfAssessment')}</span>
                                <div className="space-y-2">
                                    <h3 className={cn("font-black font-outfit break-words", getRevealWordSizeClass(currentWord.dictionary.word))}>
                                        {formatWord(currentWord.dictionary.word, useCapitalCase)}
                                    </h3>
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
                                        className="w-full h-3 bg-white/10 rounded-full appearance-none cursor-pointer accent-indigo-500"
                                    />
                                </div>
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
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full space-y-4 p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/10"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                            <CheckCircle2 size={16} />
                        </div>
                        <span className="text-xs font-bold text-indigo-300/60 uppercase tracking-[0.2em]">{t('contextualUsage')}</span>
                    </div>
                    <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 scrollbar-none">
                        {parseExamples(currentWord.dictionary.detail).length > 0 ? (
                            parseExamples(currentWord.dictionary.detail).map((ex: any, ei: number) => (
                                <div key={ei} className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                                    <p className="text-sm text-white/80 leading-relaxed italic">
                                        &quot;{ex.en || ex.example_en}&quot;
                                    </p>
                                    <p className="text-xs text-white/40 mt-1">{ex.zh || ex.example_zh}</p>
                                </div>
                            ))
                        ) : (
                            <p className="text-center py-8 text-white/20 text-xs italic">{t('noExamples')}</p>
                        )}
                    </div>
                </motion.div>
            )}
        </div>
    );
}
