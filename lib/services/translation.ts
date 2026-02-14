const FALLBACK_INSTANCES = [
    'https://libretranslate.de',
    'https://translate.argosopentech.com',
    'https://libretranslate.pussthecat.org',
    'https://translate.terraprint.co',
];

export async function translateToChinese(text: string): Promise<string | null> {
    const configUrl = process.env.LIBRE_TRANSLATE_URL;
    const apiKey = process.env.LIBRE_TRANSLATE_API_KEY;

    // Handle Google Translate API
    if (configUrl?.includes('googleapis.com') || configUrl?.includes('google')) {
        try {
            let baseUrl = configUrl.replace(/\/$/, '');
            if (!baseUrl.endsWith('/v2') && !baseUrl.includes('?')) {
                baseUrl += '/v2';
            }
            const url = new URL(baseUrl);
            url.searchParams.set('key', apiKey || '');

            const response = await fetch(url.toString(), {
                method: 'POST',
                body: JSON.stringify({
                    q: text,
                    target: 'zh',
                    format: 'text'
                }),
                headers: { 'Content-Type': 'application/json' },
            });

            if (response.ok) {
                const data = await response.json();
                // Google returns { data: { translations: [{ translatedText: '...' }] } }
                return data.data?.translations?.[0]?.translatedText || null;
            }
            console.warn('Google Translate API error:', await response.text());
        } catch (error) {
            console.error('Error with Google Translate:', error);
        }
        return null;
    }

    // Fallback to LibreTranslate logic if not Google
    const instances = configUrl ? [configUrl] : FALLBACK_INSTANCES;
    // ... rest of the LibreTranslate logic
    for (const url of instances) {
        try {
            const response = await fetch(`${url}/translate`, {
                method: 'POST',
                body: JSON.stringify({
                    q: text,
                    source: 'en',
                    target: 'zh',
                    format: 'text',
                    api_key: apiKey,
                }),
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(5000),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.translatedText) return data.translatedText;
            }
        } catch (error) {
            // silent fail, move to next instance
        }
    }

    return null;
}
