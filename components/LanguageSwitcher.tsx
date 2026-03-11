"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
// import { Globe } from "lucide-react";

export default function LanguageSwitcher() {
    const router = useRouter();
    const [locale, setLocale] = useState('zh');

    useEffect(() => {
        // Read locale from cookie on mount
        const match = document.cookie.match(/(^|;)\s*NEXT_LOCALE\s*=\s*([^;]+)/);
        if (match) {
            setLocale(match[2]);
        }
    }, []);

    const switchLang = (lang: string) => {
        // Set cookie for 1 year
        document.cookie = `NEXT_LOCALE=${lang}; path=/; max-age=31536000`;
        setLocale(lang);
        router.refresh();
    };

    return (
        <div className="flex bg-[var(--foreground-very-muted)] rounded-lg p-1 border border-[var(--card-border)]">
            <button
                onClick={() => switchLang("en")}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${locale === "en" ? "bg-indigo-600 text-white shadow-lg" : "text-[var(--foreground-muted)] hover:text-[rgb(var(--foreground-rgb))]"
                    }`}
            >
                EN
            </button>
            <button
                onClick={() => switchLang("zh")}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${locale === "zh" ? "bg-indigo-600 text-white shadow-lg" : "text-[var(--foreground-muted)] hover:text-[rgb(var(--foreground-rgb))]"
                    }`}
            >
                中文
            </button>
        </div>
    );
}
