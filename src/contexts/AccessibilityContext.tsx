/**
 * Accessibility Context
 * 
 * Provides global accessibility settings that can be consumed throughout the app.
 * Manages text scaling, high contrast mode, and autoplay preferences.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import ReadingMask from '@/components/accessibility/ReadingMask';

interface AccessibilitySettings {
    textScale: number;
    highContrast: boolean;
    autoplayMedia: boolean;
    reducedMotion: boolean;
    dyslexiaFont: boolean;
    highlightLinks: boolean;
    hideImages: boolean;
    readingMask: boolean;
    textToSpeech: boolean;
}

interface AccessibilityContextValue extends AccessibilitySettings {
    setTextScale: (scale: number) => void;
    setHighContrast: (enabled: boolean) => void;
    setAutoplayMedia: (enabled: boolean) => void;
    setReducedMotion: (enabled: boolean) => void;
    setDyslexiaFont: (enabled: boolean) => void;
    setHighlightLinks: (enabled: boolean) => void;
    setHideImages: (enabled: boolean) => void;
    setReadingMask: (enabled: boolean) => void;
    setTextToSpeech: (enabled: boolean) => void;
    speakText: (text: string, lang?: string) => void;
    stopSpeech: () => void;
    resetToDefaults: () => void;
}

const defaultSettings: AccessibilitySettings = {
    textScale: 100,
    highContrast: false,
    autoplayMedia: false,
    reducedMotion: false,
    dyslexiaFont: false,
    highlightLinks: false,
    hideImages: false,
    readingMask: false,
    textToSpeech: false
};

const AccessibilityContext = createContext<AccessibilityContextValue | undefined>(undefined);

// Storage keys
const STORAGE_KEYS = {
    TEXT_SCALE: 'ceka_text_size',
    HIGH_CONTRAST: 'ceka_high_contrast',
    AUTOPLAY_MEDIA: 'ceka_autoplay_media',
    REDUCED_MOTION: 'ceka_reduced_motion',
    DYSLEXIA_FONT: 'ceka_dyslexia_font',
    HIGHLIGHT_LINKS: 'ceka_highlight_links',
    HIDE_IMAGES: 'ceka_hide_images',
    READING_MASK: 'ceka_reading_mask',
    TEXT_TO_SPEECH: 'ceka_text_to_speech'
};

export const AccessibilityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<AccessibilitySettings>(() => {
        if (typeof window === 'undefined') return defaultSettings;

        return {
            textScale: parseInt(localStorage.getItem(STORAGE_KEYS.TEXT_SCALE) || '100', 10),
            highContrast: localStorage.getItem(STORAGE_KEYS.HIGH_CONTRAST) === 'true',
            autoplayMedia: localStorage.getItem(STORAGE_KEYS.AUTOPLAY_MEDIA) === 'true',
            reducedMotion: localStorage.getItem(STORAGE_KEYS.REDUCED_MOTION) === 'true' ||
                window.matchMedia('(prefers-reduced-motion: reduce)').matches,
            dyslexiaFont: localStorage.getItem(STORAGE_KEYS.DYSLEXIA_FONT) === 'true',
            highlightLinks: localStorage.getItem(STORAGE_KEYS.HIGHLIGHT_LINKS) === 'true',
            hideImages: localStorage.getItem(STORAGE_KEYS.HIDE_IMAGES) === 'true',
            readingMask: localStorage.getItem(STORAGE_KEYS.READING_MASK) === 'true',
            textToSpeech: localStorage.getItem(STORAGE_KEYS.TEXT_TO_SPEECH) === 'true'
        };
    });

    // Apply text scale
    useEffect(() => {
        document.documentElement.style.setProperty('--text-scale', `${settings.textScale / 100}`);
        document.documentElement.style.fontSize = `${settings.textScale}%`;
        localStorage.setItem(STORAGE_KEYS.TEXT_SCALE, settings.textScale.toString());
    }, [settings.textScale]);

    // Apply high contrast
    useEffect(() => {
        if (settings.highContrast) {
            document.documentElement.classList.add('high-contrast');
        } else {
            document.documentElement.classList.remove('high-contrast');
        }
        localStorage.setItem(STORAGE_KEYS.HIGH_CONTRAST, settings.highContrast.toString());
    }, [settings.highContrast]);

    // Store autoplay preference
    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.AUTOPLAY_MEDIA, settings.autoplayMedia.toString());
        window.dispatchEvent(new CustomEvent('autoplaySettingChange', { detail: { autoplay: settings.autoplayMedia } }));
    }, [settings.autoplayMedia]);

    // Apply reduced motion
    useEffect(() => {
        if (settings.reducedMotion) {
            document.documentElement.classList.add('reduce-motion');
        } else {
            document.documentElement.classList.remove('reduce-motion');
        }
        localStorage.setItem(STORAGE_KEYS.REDUCED_MOTION, settings.reducedMotion.toString());
    }, [settings.reducedMotion]);

    useEffect(() => {
        if (settings.dyslexiaFont) document.documentElement.classList.add('ceka-dyslexia-font');
        else document.documentElement.classList.remove('ceka-dyslexia-font');
        localStorage.setItem(STORAGE_KEYS.DYSLEXIA_FONT, settings.dyslexiaFont.toString());
    }, [settings.dyslexiaFont]);

    useEffect(() => {
        if (settings.highlightLinks) document.documentElement.classList.add('ceka-highlight-links');
        else document.documentElement.classList.remove('ceka-highlight-links');
        localStorage.setItem(STORAGE_KEYS.HIGHLIGHT_LINKS, settings.highlightLinks.toString());
    }, [settings.highlightLinks]);

    useEffect(() => {
        if (settings.hideImages) document.documentElement.classList.add('ceka-hide-images');
        else document.documentElement.classList.remove('ceka-hide-images');
        localStorage.setItem(STORAGE_KEYS.HIDE_IMAGES, settings.hideImages.toString());
    }, [settings.hideImages]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.READING_MASK, settings.readingMask.toString());
    }, [settings.readingMask]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.TEXT_TO_SPEECH, settings.textToSpeech.toString());
        // If TTS gets disabled, stop any ongoing speech
        if (!settings.textToSpeech && typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
    }, [settings.textToSpeech]);

    const setTextScale = (scale: number) => {
        setSettings(prev => ({ ...prev, textScale: Math.min(150, Math.max(80, scale)) }));
    };

    const setHighContrast = (enabled: boolean) => {
        setSettings(prev => ({ ...prev, highContrast: enabled }));
    };

    const setAutoplayMedia = (enabled: boolean) => {
        setSettings(prev => ({ ...prev, autoplayMedia: enabled }));
    };

    const setReducedMotion = (enabled: boolean) => {
        setSettings(prev => ({ ...prev, reducedMotion: enabled }));
    };

    const setDyslexiaFont = (enabled: boolean) => setSettings(prev => ({ ...prev, dyslexiaFont: enabled }));
    const setHighlightLinks = (enabled: boolean) => setSettings(prev => ({ ...prev, highlightLinks: enabled }));
    const setHideImages = (enabled: boolean) => setSettings(prev => ({ ...prev, hideImages: enabled }));
    const setReadingMask = (enabled: boolean) => setSettings(prev => ({ ...prev, readingMask: enabled }));
    const setTextToSpeech = (enabled: boolean) => setSettings(prev => ({ ...prev, textToSpeech: enabled }));

    // Speak given text using the browser's Speech Synthesis API
    const speakText = useCallback((text: string, lang = 'en-GB') => {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 0.95;
        utterance.pitch = 1;
        window.speechSynthesis.speak(utterance);
    }, []);

    const stopSpeech = useCallback(() => {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    }, []);

    const resetToDefaults = () => {
        setSettings(defaultSettings);
    };

    return (
        <AccessibilityContext.Provider
            value={{
                ...settings,
                setTextScale,
                setHighContrast,
                setAutoplayMedia,
                setReducedMotion,
                setDyslexiaFont,
                setHighlightLinks,
                setHideImages,
                setReadingMask,
                setTextToSpeech,
                speakText,
                stopSpeech,
                resetToDefaults
            }}
        >
            {settings.readingMask && <ReadingMask />}
            {children}
        </AccessibilityContext.Provider>
    );
};

export const useAccessibility = (): AccessibilityContextValue => {
    const context = useContext(AccessibilityContext);
    if (!context) {
        throw new Error('useAccessibility must be used within an AccessibilityProvider');
    }
    return context;
};

export default AccessibilityContext;
