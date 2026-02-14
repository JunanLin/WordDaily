declare module 'wink-lemmatizer' {
    export function lemmatize(word: string): string;
    const lemmatizer: {
        lemmatize: (word: string) => string;
    };
    export default lemmatizer;
}
