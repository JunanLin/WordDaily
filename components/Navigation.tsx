'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PlusCircle, BookOpen, History, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

import { useTranslations } from 'next-intl';

export default function Navigation() {
    const pathname = usePathname();
    const t = useTranslations('nav');

    const navItems = [
        { href: '/', icon: Home, label: t('dashboard') },
        { href: '/add', icon: PlusCircle, label: t('addWord') },
        { href: '/review', icon: BookOpen, label: t('review') },
        { href: '/history', icon: History, label: t('history') },
        { href: '/settings', icon: Settings, label: t('settings') },
    ];

    return (
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm glass-panel py-3 px-6 z-50 shadow-2xl">
            <ul className="flex justify-between items-center">
                {navItems.map(({ href, icon: Icon, label }) => {
                    const isActive = pathname === href;
                    return (
                        <li key={href}>
                            <Link
                                href={href}
                                className={cn(
                                    "flex flex-col items-center gap-1 transition-all duration-300",
                                    isActive ? "text-indigo-500 scale-110" : "text-white/40 hover:text-white/70"
                                )}
                            >
                                <Icon size={24} />
                                <span className="text-[10px] font-medium">{label}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
