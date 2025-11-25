import { Language } from './types';

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'de', name: 'Deutsch', flag: '🇩🇪', geminiName: 'German' },
  { code: 'en', name: 'English', flag: '🇬🇧', geminiName: 'English' },
  { code: 'fr', name: 'Français', flag: '🇫🇷', geminiName: 'French' },
  { code: 'es', name: 'Español', flag: '🇪🇸', geminiName: 'Spanish' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷', geminiName: 'Turkish' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹', geminiName: 'Italian' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱', geminiName: 'Polish' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', geminiName: 'Arabic' },
  { code: 'zh', name: '中文', flag: '🇨🇳', geminiName: 'Mandarin Chinese' },
  { code: 'uk', name: 'Українська', flag: '🇺🇦', geminiName: 'Ukrainian' },
];

export const DEFAULT_AGENT_LANGUAGE = SUPPORTED_LANGUAGES[1]; // English default for agent
export const DEFAULT_CUSTOMER_LANGUAGE = SUPPORTED_LANGUAGES[0]; // German default for customer
