'use client';

import { useState } from 'react';
import { refreshAllWords } from '@/lib/actions/refresh-words';
import { Loader2, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function RefreshPage() {
    const [status, setStatus] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const handleRefresh = async () => {
        setLoading(true);
        try {
            const res = await refreshAllWords();
            setStatus(res);
        } catch (err: any) {
            setStatus({ success: false, error: err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-white/5 rounded-3xl border border-white/10 m-6">
            <h2 className="text-2xl font-bold mb-4 uppercase tracking-wider">Database Refresh</h2>
            <p className="text-white/40 mb-8 max-w-sm">
                This will iterate through all words in the database and refresh their definitions and examples from Wordnik.
            </p>

            {!status ? (
                <button
                    onClick={handleRefresh}
                    disabled={loading}
                    className="btn-primary flex items-center gap-2"
                >
                    {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                    {loading ? 'Refreshing...' : 'Start Full Refresh'}
                </button>
            ) : (
                <div className="space-y-4">
                    <CheckCircle2 className="mx-auto text-green-400" size={48} />
                    <div className="space-y-1">
                        <p className="font-bold text-xl">Refresh Complete!</p>
                        <p className="text-white/40">Success: {status.successCount} | Failed: {status.failCount}</p>
                    </div>
                    <p className="text-xs text-red-400 mt-4 italic">Please delete this page after use.</p>
                </div>
            )}
        </div>
    );
}
