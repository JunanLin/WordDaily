import OpenAI from 'openai';

const apiKey = process.env.DEEPSEEK_API_KEY;
const openai = apiKey ? new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: apiKey,
}) : null;

export interface DeepSeekExample {
    en: string;
    zh: string;
}

export interface DeepSeekResult {
    translation: string;
    examples: DeepSeekExample[];
}

export async function fetchEnrichmentFromDeepSeek(word: string): Promise<DeepSeekResult | null> {
    if (!openai) {
        console.warn('[DeepSeek] API key is missing.');
        return null;
    }

    try {
        const completion = await openai.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: 'You are a professional dictionary assistant. Generate a concise Chinese translation and 4 professional English-Chinese example sentences for the given word. Return data ONLY in the following JSON format: { "translation": "中文翻译", "examples": [{ "en": "English sentence", "zh": "中文翻译" }] }'
                },
                { role: 'user', content: word }
            ],
            model: 'deepseek-chat',
            response_format: { type: 'json_object' }
        });

        const content = completion.choices[0].message.content;
        if (content) {
            const parsed = JSON.parse(content);
            return {
                translation: parsed.translation || '',
                examples: parsed.examples || []
            };
        }
    } catch (error: any) {
        console.error('[DeepSeek] Error:', error.message);
    }
    return null;
}
