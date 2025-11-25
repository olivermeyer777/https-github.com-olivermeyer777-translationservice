import { Language } from './types';

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'de', name: 'Deutsch', flag: '🇩🇪', geminiName: 'German', greeting: 'Guten Tag' },
  { code: 'en', name: 'English', flag: '🇬🇧', geminiName: 'English', greeting: 'Hello' },
  { code: 'fr', name: 'Français', flag: '🇫🇷', geminiName: 'French', greeting: 'Bonjour' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹', geminiName: 'Italian', greeting: 'Buongiorno' },
  { code: 'es', name: 'Español', flag: '🇪🇸', geminiName: 'Spanish', greeting: 'Hola' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷', geminiName: 'Turkish', greeting: 'Merhaba' },
  { code: 'pt', name: 'Português', flag: '🇵🇹', geminiName: 'Portuguese', greeting: 'Olá' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', geminiName: 'Arabic', greeting: 'As-salamu alaykum' },
  { code: 'zh', name: '中文', flag: '🇨🇳', geminiName: 'Mandarin Chinese', greeting: 'Ni Hao' },
  { code: 'uk', name: 'Українська', flag: '🇺🇦', geminiName: 'Ukrainian', greeting: 'Dobriy den' },
];

export const DEFAULT_AGENT_LANGUAGE = SUPPORTED_LANGUAGES[1]; // English default for agent
export const DEFAULT_CUSTOMER_LANGUAGE = SUPPORTED_LANGUAGES[0]; // German default for customer
