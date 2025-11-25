
import React from 'react';
import { Language } from '../types';
import { SUPPORTED_LANGUAGES } from '../constants';

interface LanguageSelectorProps {
  onSelect: (lang: Language) => void;
  selectedLang?: Language;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ onSelect, selectedLang }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full">
      {SUPPORTED_LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          onClick={() => onSelect(lang)}
          className={`
            relative overflow-hidden p-6 rounded-2xl border transition-all duration-300 group
            flex flex-col items-center justify-center gap-3
            ${selectedLang?.code === lang.code 
              ? 'border-yellow-400 bg-yellow-50/80 shadow-[0_0_20px_rgba(250,204,21,0.3)] scale-[1.02]' 
              : 'border-gray-100 bg-white hover:border-yellow-200 hover:shadow-xl hover:shadow-yellow-100/50 hover:-translate-y-1'
            }
          `}
        >
          <div className={`text-4xl transition-transform duration-300 ${selectedLang?.code === lang.code ? 'scale-110' : 'group-hover:scale-110'}`}>
            {lang.flag}
          </div>
          <span className={`font-semibold text-sm sm:text-base ${selectedLang?.code === lang.code ? 'text-gray-900' : 'text-gray-600 group-hover:text-gray-900'}`}>
            {lang.name}
          </span>
          
          {/* Selection Indicator */}
          {selectedLang?.code === lang.code && (
            <div className="absolute top-3 right-3 w-2 h-2 bg-yellow-400 rounded-full" />
          )}
        </button>
      ))}
    </div>
  );
};