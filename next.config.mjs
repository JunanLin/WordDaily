import createNextIntlPlugin from 'next-intl/plugin';
import withPWAInit from "@ducanh2912/next-pwa";

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const withPWA = withPWAInit({
    dest: "public",
    disable: false, // Enabled in dev to allow testing push notifications
    register: true,
    skipWaiting: true,
    customWorkerDir: "worker",
});

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default withPWA(withNextIntl(nextConfig));

module.exports = {
    eslint: {
        ignoreDuringBuilds: true,
    },
};
