'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PlusCircle, BookOpen, History, Settings, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { getDueCount } from '@/lib/actions/review';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navigation() {
    const pathname = usePathname();
    const t = useTranslations('nav');
    const [dueCount, setDueCount] = useState(0);

    useEffect(() => {
        const fetchCount = async () => {
            const count = await getDueCount();
            setDueCount(count);
        };
        fetchCount();

        // Listen for immediate updates
        const handleRefresh = () => fetchCount();
        const handleFinished = () => setDueCount(0);

        window.addEventListener('refresh-due-count', handleRefresh);
        window.addEventListener('review-finished', handleFinished);

        // Refresh every minute
        const interval = setInterval(fetchCount, 60000);
        return () => {
            clearInterval(interval);
            window.removeEventListener('refresh-due-count', handleRefresh);
            window.removeEventListener('review-finished', handleFinished);
        };
    }, []);

    const navItems = [
        { href: '/', icon: Home, label: t('dashboard') },
        { href: '/lists', icon: PlusCircle, label: t('lists') },
        { href: '/review', icon: BookOpen, label: t('review'), isReview: true },
        { href: '/history', icon: History, label: t('history') },
        { href: '/settings', icon: Settings, label: t('settings') },
    ];

    // Hide navigation on auth-related pages that require focus
    const hiddenPaths = ['/reset-password', '/forgot-password', '/oauth/consent'];
    if (hiddenPaths.includes(pathname)) return null;

    return (
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm glass-panel py-3 px-6 z-50 shadow-2xl">
            <ul className="flex justify-between items-center">
                {navItems.map(({ href, icon: Icon, label, isReview }) => {
                    const isActive = pathname === href;
                    const showFire = isReview && dueCount > 0;

                    return (
                        <li key={href} className="relative">
                            <Link
                                href={href}
                                className={cn(
                                    "flex flex-col items-center gap-1 transition-all duration-300",
                                    isActive ? "text-indigo-500 scale-110" : "text-[var(--foreground-40)] hover:text-[rgb(var(--foreground-rgb))]"
                                )}
                            >
                                <div className="relative">
                                    <Icon size={24} className={cn(showFire && "text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.8)]")} />
                                    {showFire && (
                                        <div className="absolute inset-0 -z-10">
                                            {/* Intense Core Glow */}
                                            <div className="absolute inset-0 bg-orange-500/40 blur-xl rounded-full animate-pulse" />
                                            <div className="absolute inset-0 bg-yellow-500/20 blur-2xl rounded-full animate-pulse delay-75" />

                                            {/* Flame Particles */}
                                            {[...Array(6)].map((_, i) => (
                                                <motion.div
                                                    key={i}
                                                    initial={{ opacity: 0, y: 0, x: 0, scale: 0.5 }}
                                                    animate={{
                                                        opacity: [0, 0.8, 0],
                                                        y: [-10 - Math.random() * 20],
                                                        x: [(Math.random() - 0.5) * 15],
                                                        scale: [0.5, 1.2, 0.3],
                                                    }}
                                                    transition={{
                                                        duration: 1 + Math.random(),
                                                        repeat: Infinity,
                                                        delay: i * 0.2,
                                                        ease: "easeOut"
                                                    }}
                                                    className="absolute top-0 left-1/2 -translate-x-1/2 text-orange-400"
                                                >
                                                    <Flame size={8 + Math.random() * 8} fill="currentColor" />
                                                </motion.div>
                                            ))}

                                            {/* Heat Distortion/Glow Layers */}
                                            <motion.div
                                                animate={{
                                                    scale: [1, 1.5, 1],
                                                    opacity: [0.2, 0.5, 0.2]
                                                }}
                                                transition={{ duration: 1.5, repeat: Infinity }}
                                                className="absolute -inset-2 bg-red-600/10 blur-2xl rounded-full"
                                            />
                                        </div>
                                    )}
                                    {showFire && (
                                        <motion.div
                                            animate={{
                                                y: [-1, 1, -1],
                                                rotate: [-2, 2, -2]
                                            }}
                                            transition={{ duration: 0.5, repeat: Infinity }}
                                            className="absolute -top-2 -right-2 text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.8)]"
                                        >
                                            <Flame size={16} fill="currentColor" />
                                        </motion.div>
                                    )}
                                </div>
                                <span className="text-[10px] font-medium">{label}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
