'use client';

import { useState, useMemo } from 'react';
import { Target, Bell, Clock, Globe, Save, Loader2, SendHorizonal } from 'lucide-react';
import { updateUserSettings, savePushSubscription, deletePushSubscription } from '@/lib/actions/user-settings';
import { cn } from '@/lib/utils';
import { subscribeToPush, unsubscribeFromPush } from '@/lib/push-notifications';
import { getModernTimezones } from '@/lib/timezones';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from './LanguageSwitcher';

interface SettingsFormProps {
    profile: {
        daily_goal: number;
        notifications_enabled: boolean;
        day_reminder_time: string;
        review_reminder_time: string;
        timezone: string;
    };
}

export default function SettingsForm({ profile }: SettingsFormProps) {
    const t = useTranslations('settings');
    const [loading, setLoading] = useState(false);
    const [testLoading, setTestLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const timezones = useMemo(() => getModernTimezones(), []);

    const [form, setForm] = useState({
        daily_goal: profile.daily_goal,
        notifications_enabled: profile.notifications_enabled,
        day_reminder_time: profile.day_reminder_time,
        review_reminder_time: profile.review_reminder_time,
        timezone: profile.timezone || 'UTC',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        try {
            await updateUserSettings(form);
            setStatus({ type: 'success', message: t('success') });
        } catch (error) {
            console.error(error);
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
            if (!res.ok) throw new Error('Request failed');
            setStatus({ type: 'success', message: t('testNotificationSuccess') });
        } catch {
            setStatus({ type: 'error', message: t('testNotificationError') });
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

                <div className="h-px bg-white/5" />

                {/* Daily Goal */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-indigo-400">
                            <Target size={20} />
                            <span className="font-bold uppercase tracking-widest text-[10px]">{t('learningGoal')}</span>
                        </div>
                        <input
                            type="number"
                            min="1"
                            max="100"
                            value={form.daily_goal}
                            onChange={(e) => setForm({ ...form, daily_goal: parseInt(e.target.value) })}
                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 w-20 text-right font-bold focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <p className="text-xs text-white/30">{t('learningGoalDesc')}</p>
                </div>

                <div className="h-px bg-white/5" />

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
                                form.notifications_enabled ? "bg-emerald-500" : "bg-white/10"
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
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-white/40">
                                        <Clock size={14} />
                                        <label className="text-[10px] font-bold uppercase tracking-wider">{t('newWords')}</label>
                                    </div>
                                    <input
                                        type="time"
                                        value={form.day_reminder_time}
                                        onChange={(e) => setForm({ ...form, day_reminder_time: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none font-medium"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-white/40">
                                        <Clock size={14} />
                                        <label className="text-[10px] font-bold uppercase tracking-wider">{t('reviewSession')}</label>
                                    </div>
                                    <input
                                        type="time"
                                        value={form.review_reminder_time}
                                        onChange={(e) => setForm({ ...form, review_reminder_time: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none font-medium"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-white/40">
                                    <Globe size={14} />
                                    <label className="text-[10px] font-bold uppercase tracking-wider">{t('timezone')}</label>
                                </div>
                                <select
                                    value={form.timezone}
                                    onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none font-medium appearance-none"
                                >
                                    {timezones.map((tz) => (
                                        <option key={tz.value} value={tz.value} className="bg-slate-900">
                                            {tz.label}
                                        </option>
                                    ))}
                                </select>
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
                    <p className="text-xs text-white/30">{t('notificationsDesc')}</p>
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
