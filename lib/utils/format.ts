export function formatWord(word: string, useCapitalCase: boolean) {
    if (!word) return '';
    return useCapitalCase ? word.toUpperCase() : word.toLowerCase();
}
