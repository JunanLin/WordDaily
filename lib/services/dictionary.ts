export interface WordnikDefinition {
    partOfSpeech: string;
    text: string;
    sourceDictionary: string;
    exampleUses?: Array<{ text: string }>;
}

export interface WordnikExample {
    text: string;
    title: string;
}

export interface WordnikAudio {
    fileUrl: string;
    audioType: string;
}

export interface DictionaryData {
    word: string;
    phonetic?: string;
    audioUrl?: string;
    definitions: Array<{
        partOfSpeech: string;
        definition: string;
        examples?: string[];
    }>;
    examples: Array<{
        text: string;
    }>;
}

const WORDNIK_BASE_URL = 'https://api.wordnik.com/v4';

export async function fetchDictionaryData(word: string): Promise<DictionaryData | null> {
    const apiKey = process.env.WORDNIK_API_KEY;
    if (!apiKey || apiKey.includes('PLACEHOLDER')) {
        console.warn('[Dictionary] Wordnik API key is missing or not set.');
        throw new Error('Dictionary service configuration missing. Please ensure WORDNIK_API_KEY is set in production.');
    }

    console.log(`[Dictionary] Fetching Wordnik data for: ${word}`);
    const normalizedWord = word.trim().toLowerCase();

    try {
        const [defsRes, audioRes] = await Promise.all([
            fetch(`${WORDNIK_BASE_URL}/word.json/${normalizedWord}/definitions?limit=5&includeRelated=false&useCanonical=false&includeTags=false&api_key=${apiKey}`),
            fetch(`${WORDNIK_BASE_URL}/word.json/${normalizedWord}/audio?useCanonical=false&limit=1&api_key=${apiKey}`)
        ]);

        if (defsRes.status === 401) {
            throw new Error('Dictionary service unauthorized. The API key might be invalid.');
        }

        if (!defsRes.ok) {
            console.error(`[Dictionary] Failed to fetch definitions: ${defsRes.status}`);
            return null;
        }

        const definitions: WordnikDefinition[] = await defsRes.json();
        const audio: WordnikAudio[] = await audioRes.json();

        const filteredDefs = definitions
            .filter(d => d.text && d.text.trim())
            .map(d => ({
                partOfSpeech: d.partOfSpeech,
                definition: d.text,
                examples: d.exampleUses?.map(ex => ex.text)
            }));

        if (filteredDefs.length === 0) return null;

        return {
            word: normalizedWord,
            audioUrl: audio[0]?.fileUrl || undefined,
            definitions: filteredDefs,
            examples: [] // We use DeepSeek for examples now
        };
    } catch (error) {
        console.error('[Dictionary] Error fetching from Wordnik:', error);
        return null;
    }
}
