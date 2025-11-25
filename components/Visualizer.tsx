
import React from 'react';

export const Visualizer: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  return (
    <div className="flex items-center justify-center gap-1.5 h-12">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className={`w-1.5 bg-yellow-400 rounded-full transition-all duration-300 ease-in-out ${isActive ? 'animate-pulse' : 'h-1.5 opacity-30'}`}
          style={{
            height: isActive ? `${Math.random() * 24 + 12}px` : '6px',
            animationDelay: `${i * 0.1}s`,
            animationDuration: '0.6s'
          }}
        />
      ))}
    </div>
  );
};