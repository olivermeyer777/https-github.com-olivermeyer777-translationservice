import React from 'react';

export const TranslationBubble: React.FC<{ show: boolean }> = ({ show }) => {
  if (!show) return null;

  return (
    <div className="absolute bottom-20 left-6 z-20 animate-bounce-in">
      <div className="bg-white/90 backdrop-blur-md text-black px-4 py-3 rounded-2xl rounded-bl-none shadow-lg border border-yellow-400 flex items-center gap-3">
        <div className="flex gap-1 h-3 items-center">
            <div className="w-2 h-2 bg-[#FFCC00] rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
            <div className="w-2 h-2 bg-[#FFCC00] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-[#FFCC00] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
        <span className="text-xs font-bold uppercase tracking-wide">Translating...</span>
      </div>
    </div>
  );
};
