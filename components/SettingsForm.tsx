'use client';

import { useState, useMemo, useEffect } from 'react';
import { Bell, Clock, Globe, Save, Loader2, SendHorizonal, Sun, Moon, Type } from 'lucide-react';
import { updateUserSettings, savePushSubscription, deletePushSubscription } from '@/lib/actions/user-settings';
import { cn } from '@/lib/utils';
import { subscribeToPush, unsubscribeFromPush } from '@/lib/push-notifications';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from './LanguageSwitcher';

interface SettingsFormProps {
    profile: {
        notifications_enabled: boolean;
        day_reminder_time: string;
        review_reminder_time: string;
        timezone: string;
        use_capital_case: boolean;
    };
}

export default function SettingsForm({ profile }: SettingsFormProps) {
    const t = useTranslations('settings');
    const [loading, setLoading] = useState(false);
    const [testLoading, setTestLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const [form, setForm] = useState({
        notifications_enabled: profile.notifications_enabled,
        day_reminder_time: profile.day_reminder_time,
        review_reminder_time: profile.review_reminder_time,
        use_capital_case: profile.use_capital_case,
        theme: 'dark', // Default for server render
        fontSize: 'standard', // Default for server render
    });

    useEffect(() => {
        const theme = document.cookie.match(/(^|;)\s*NEXT_THEME\s*=\s*([^;]+)/)?.[2] || 'dark';
        const fontSize = document.cookie.match(/(^|;)\s*NEXT_FONT_SIZE\s*=\s*([^;]+)/)?.[2] || 'standard';
        setForm(prev => ({ ...prev, theme, fontSize }));
    }, []);

    const updateAppearance = (key: 'theme' | 'fontSize', value: string) => {
        setForm(prev => ({ ...prev, [key]: value }));
        const cookieName = key === 'theme' ? 'NEXT_THEME' : 'NEXT_FONT_SIZE';
        document.cookie = `${cookieName}=${value}; path=/; max-age=31536000`;
        // Refresh to apply classes in layout.tsx
        window.location.reload();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        try {
            // Persist appearance settings in cookies (client-side state)
            document.cookie = `NEXT_THEME=${form.theme}; path=/; max-age=31536000`;
            document.cookie = `NEXT_FONT_SIZE=${form.fontSize}; path=/; max-age=31536000`;

            const res = await updateUserSettings(form);
            if (res.success) {
                setStatus({ type: 'success', message: t('success') });
                // We don't necessarily need to reload here because updating appearance 
                // toggles already calls reload(), but this ensures consistency 
                // for other settings as well.
            }
        } catch (error) {
            console.error('Settings save error:', error);
            setStatus({ type: 'error', message: t('error') });
        } finally {
            setLoading(false);
        }
    };

    const handleTestNotification = async () => {
        setTestLoading(true);
        setStatus(null);
        try {
            const res = await fetch('/api/notifications/test', { method: 'POST' });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || t('testNotificationError'));
            }

            setStatus({ type: 'success', message: t('testNotificationSuccess') });
        } catch (error: any) {
            setStatus({ type: 'error', message: error.message || t('testNotificationError') });
        } finally {
            setTestLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="card space-y-6">
                {/* Language Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-emerald-400">
                            <Globe size={20} />
                            <span className="font-bold uppercase tracking-widest text-[10px]">{t('language')}</span>
                        </div>
                        <LanguageSwitcher />
                    </div>
                </div>

                <div className="h-px bg-[var(--foreground-10)]" />

                {/* Case Preference */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-amber-400">
                            < Globe size={20} />
                            <span className="font-bold uppercase tracking-widest text-[10px]">{t('casePreference')}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={cn("text-[10px] font-bold uppercase tracking-widest transition-colors", !form.use_capital_case ? "text-[var(--indigo-text)]" : "text-[var(--foreground-very-muted)]")}>
                                {t('lowerCase')}
                            </span>
                            <button
                                type="button"
                                onClick={() => setForm({ ...form, use_capital_case: !form.use_capital_case })}
                                className={cn(
                                    "w-11 h-6 rounded-full transition-colors relative",
                                    form.use_capital_case ? "bg-indigo-500" : "bg-[var(--foreground-20)]"
                                )}
                            >
                                <div className={cn(
                                    "w-4 h-4 bg-white rounded-full absolute top-1 transition-all",
                                    form.use_capital_case ? "right-1" : "left-1"
                                )} />
                            </button>
                            <span className={cn("text-[10px] font-bold uppercase tracking-widest transition-colors", form.use_capital_case ? "text-[var(--indigo-text)]" : "text-[var(--foreground-very-muted)]")}>
                                {t('capitalCase')}
                            </span>
                        </div>
                    </div>
                    <p className="text-xs text-[var(--foreground-muted)] opacity-60">{t('casePreferenceDesc')}</p>
                </div>

                <div className="h-px bg-[var(--foreground-10)]" />

                {/* Appearance Section */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 text-[var(--indigo-text)]">
                        <Type size={20} />
                        <span className="font-bold uppercase tracking-widest text-[10px]">{t('appearance')}</span>
                    </div>

                    {/* Theme Toggle */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-[var(--foreground-muted)]">
                            {form.theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
                            <span className="text-sm font-medium">{t('theme')}</span>
                        </div>
                        <div className="flex bg-[var(--foreground-very-muted)] rounded-xl p-1 border border-[var(--card-border)]">
                            <button
                                type="button"
                                onClick={() => updateAppearance('theme', 'light')}
                                className={cn(
                                    "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                                    form.theme === 'light' ? "bg-indigo-600 text-white shadow-lg" : "text-[var(--foreground-muted)] hover:text-[rgb(var(--foreground-rgb))]"
                                )}
                            >
                                {t('lightTheme')}
                            </button>
                            <button
                                type="button"
                                onClick={() => updateAppearance('theme', 'dark')}
                                className={cn(
                                    "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                                    form.theme === 'dark' ? "bg-[var(--foreground-20)] text-[rgb(var(--foreground-rgb))] shadow-lg" : "text-[var(--foreground-muted)] hover:text-[rgb(var(--foreground-rgb))]"
                                )}
                            >
                                {t('darkTheme')}
                            </button>
                        </div>
                    </div>

                    {/* Font Size Toggle */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-[var(--foreground-muted)]">
                            <Type size={18} />
                            <span className="text-sm font-medium">{t('fontSize')}</span>
                        </div>
                        <div className="flex bg-[var(--foreground-very-muted)] rounded-xl p-1 border border-[var(--card-border)]">
                            <button
                                type="button"
                                onClick={() => updateAppearance('fontSize', 'standard')}
                                className={cn(
                                    "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                                    form.fontSize === 'standard' ? "bg-indigo-600 text-white shadow-lg" : "text-[var(--foreground-muted)] hover:text-[rgb(var(--foreground-rgb))]"
                                )}
                            >
                                {t('fontSizeStandard')}
                            </button>
                            <button
                                type="button"
                                onClick={() => updateAppearance('fontSize', 'large')}
                                className={cn(
                                    "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                                    form.fontSize === 'large' ? "bg-[var(--foreground-20)] text-[rgb(var(--foreground-rgb))] shadow-lg" : "text-[var(--foreground-muted)] hover:text-[rgb(var(--foreground-rgb))]"
                                )}
                            >
                                {t('fontSizeLarge')}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="h-px bg-[var(--foreground-10)]" />

                {/* Notifications */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-pink-400">
                            <Bell size={20} />
                            <span className="font-bold uppercase tracking-widest text-[10px]">{t('notifications')}</span>
                        </div>
                        <button
                            type="button"
                            onClick={async () => {
                                const newVal = !form.notifications_enabled;
                                setForm({ ...form, notifications_enabled: newVal });
                                setStatus(null);

                                if (newVal) {
                                    try {
                                        const sub = await subscribeToPush(t);
                                        if (sub) {
                                            const subJson = sub.toJSON();
                                            if (subJson.endpoint && subJson.keys?.p256dh && subJson.keys?.auth) {
                                                await savePushSubscription({
                                                    endpoint: subJson.endpoint,
                                                    keys: {
                                                        p256dh: subJson.keys.p256dh,
                                                        auth: subJson.keys.auth
                                                    }
                                                });
                                            }
                                        }
                                    } catch (err) {
                                        console.error('Push subscription failed:', err);
                                        const message = err instanceof Error ? err.message : t('pushError');
                                        setStatus({ type: 'error', message });
                                        setForm(f => ({ ...f, notifications_enabled: false }));
                                    }
                                } else {
                                    try {
                                        const endpoint = await unsubscribeFromPush();
                                        if (endpoint) {
                                            await deletePushSubscription(endpoint);
                                        }
                                    } catch (err) {
                                        console.error('Failed to unsubscribe:', err);
                                    }
                                }
                            }}
                            className={cn(
                                "w-11 h-6 rounded-full transition-colors relative",
                                form.notifications_enabled ? "bg-emerald-500" : "bg-[var(--foreground-20)]"
                            )}
                        >
                            <div className={cn(
                                "w-4 h-4 bg-white rounded-full absolute top-1 transition-all",
                                form.notifications_enabled ? "right-1" : "left-1"
                            )} />
                        </button>
                    </div>

                    {form.notifications_enabled && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2 flex flex-col items-center sm:items-start text-center sm:text-left">
                                    <div className="flex items-center gap-2 text-[var(--foreground-muted)]">
                                        <Clock size={14} />
                                        <label className="text-[10px] font-bold uppercase tracking-wider">{t('newWords')}</label>
                                    </div>
                                    <input
                                        type="time"
                                        value={form.day_reminder_time}
                                        onChange={(e) => setForm({ ...form, day_reminder_time: e.target.value })}
                                        className="w-full max-w-[140px] sm:max-w-none bg-[var(--foreground-very-muted)] border border-[var(--card-border)] rounded-xl px-4 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none font-medium text-center sm:text-left text-[rgb(var(--foreground-rgb))]"
                                    />
                                </div>
                                <div className="space-y-2 flex flex-col items-center sm:items-start text-center sm:text-left">
                                    <div className="flex items-center gap-2 text-[var(--foreground-muted)]">
                                        <Clock size={14} />
                                        <label className="text-[10px] font-bold uppercase tracking-wider">{t('reviewSession')}</label>
                                    </div>
                                    <input
                                        type="time"
                                        value={form.review_reminder_time}
                                        onChange={(e) => setForm({ ...form, review_reminder_time: e.target.value })}
                                        className="w-full max-w-[140px] sm:max-w-none bg-[var(--foreground-very-muted)] border border-[var(--card-border)] rounded-xl px-4 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none font-medium text-center sm:text-left text-[rgb(var(--foreground-rgb))]"
                                    />
                                </div>
                            </div>

                            <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex items-center gap-3">
                                < Globe size={16} className="text-[var(--indigo-text)] shrink-0" />
                                <div className="text-[10px] text-[var(--foreground-muted)] leading-tight">
                                    <p className="font-bold opacity-80 mb-0.5 uppercase tracking-wider text-[rgb(var(--foreground-rgb))]">{t('timezone')}</p>
                                    <p>Automatic: {profile.timezone || 'Detecting...'}</p>
                                </div>
                            </div>

                            {/* Test Notification Button */}
                            <button
                                type="button"
                                onClick={handleTestNotification}
                                disabled={testLoading}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 text-sm font-bold hover:bg-pink-500/20 transition-colors disabled:opacity-50"
                            >
                                {testLoading ? <Loader2 className="animate-spin" size={16} /> : <SendHorizonal size={16} />}
                                {t('sendTestNotification')}
                            </button>
                        </div>
                    )}
                    <p className="text-xs text-[var(--foreground-muted)] opacity-60">{t('notificationsDesc')}</p>
                </div>
            </div>

            {status && (
                <div className={cn(
                    "p-4 rounded-2xl text-sm font-medium animate-in fade-in duration-300",
                    status.type === 'success' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                )}>
                    {status.message}
                </div>
            )}

            <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-4 flex items-center justify-center gap-2 group"
            >
                {loading ? <Loader2 className="animate-spin" size={20} /> : (
                    <>
                        <Save size={20} className="group-hover:scale-110 transition-transform" />
                        {t('save')}
                    </>
                )}
            </button>
        </form>
    );
}
