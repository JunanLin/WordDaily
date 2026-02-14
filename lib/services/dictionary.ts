export interface DictionaryData {
    lemma: string;
    phonetic?: string;
    audioUrl?: string;
    meanings: Array<{
        partOfSpeech: string;
        definitions: Array<{
            definition: string;
            example?: string;
        }>;
    }>;
}

interface DictionaryMeaning {
    partOfSpeech: string;
    definitions: Array<{
        definition: string;
        example?: string;
    }>;
}

interface DictionaryEntry {
    word: string;
    phonetic?: string;
    phonetics: Array<{
        audio: string;
    }>;
    meanings: Array<{
        partOfSpeech: string;
        definitions: Array<{
            definition: string;
            example?: string;
        }>;
    }>;
}

export async function fetchDictionaryData(word: string): Promise<DictionaryData | null> {
    console.log(`[Dictionary] Fetching data for: ${word}`);
    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        if (!response.ok) return null;

        const data: DictionaryEntry[] = await response.json();
        if (!Array.isArray(data) || data.length === 0) return null;

        const allMeanings: DictionaryMeaning[] = [];
        let firstPhonetic = '';
        let firstAudio = '';

        // Iterate through all entries to get a comprehensive definition set
        data.forEach((entry) => {
            if (!firstPhonetic && entry.phonetic) firstPhonetic = entry.phonetic;
            if (!firstAudio) {
                const audio = entry.phonetics?.find((p) => p.audio && p.audio.length > 0)?.audio;
                if (audio) {
                    firstAudio = audio.startsWith('//') ? `https:${audio}` : audio;
                }
            }

            entry.meanings.forEach((m) => {
                allMeanings.push({
                    partOfSpeech: m.partOfSpeech,
                    definitions: m.definitions.map((d) => ({
                        definition: d.definition,
                        example: d.example,
                    })),
                });
            });
        });

        return {
            lemma: data[0].word,
            phonetic: firstPhonetic,
            audioUrl: firstAudio,
            meanings: allMeanings,
        };
    } catch (error) {
        console.error('Error fetching dictionary data:', error);
        return null;
    }
}
