'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import PWAInstallTutorial from './PWAInstallTutorial';

export default function PWAInstallTrigger() {
    const [show, setShow] = useState(false);

    useEffect(() => {
        // Check if shown before
        const shown = localStorage.getItem('pwa_tutorial_shown') === 'true';
        if (shown) return;

        // Wait 2 seconds
        const timer = setTimeout(() => {
            setShow(true);
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <AnimatePresence>
            {show && <PWAInstallTutorial onClose={() => setShow(false)} />}
        </AnimatePresence>
    );
}
