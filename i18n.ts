import { getRequestConfig } from 'next-intl/server';

export const locales = ['en', 'zh'];
export const defaultLocale = 'en';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default getRequestConfig(async ({ locale }: { locale: string }) => ({
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    messages: (await import(`./messages/${locale}.json`)).default
}));
