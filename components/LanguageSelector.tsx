
import React from 'react';
import { Language } from '../types';
import { SUPPORTED_LANGUAGES } from '../constants';

interface LanguageSelectorProps {
  onSelect: (lang: Language) => void;
  selectedLang?: Language;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ onSelect, selectedLang }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
      {SUPPORTED_LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          onClick={() => onSelect(lang)}
          className={`
            relative flex flex-col items-center justify-center p-6 rounded-xl transition-all duration-200
            ${selectedLang?.code === lang.code 
              ? 'bg-[#FFCC00] text-black shadow-lg scale-[1.02] ring-4 ring-[#FFCC00]/30' 
              : 'bg-white border-2 border-gray-100 hover:border-[#FFCC00] hover:shadow-md text-gray-700'
            }
          `}
        >
          <span className="text-4xl mb-2">{lang.flag}</span>
          <span className="font-bold text-lg">{lang.name}</span>
          <span className={`text-xs mt-1 ${selectedLang?.code === lang.code ? 'text-black/70' : 'text-gray-400'}`}>
            {lang.greeting}
          </span>
        </button>
      ))}
    </div>
  );
};
