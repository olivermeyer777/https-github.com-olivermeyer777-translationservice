
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'pulse' | 'glass';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  fullWidth = false,
  className = '', 
  icon,
  ...props 
}) => {
  const baseStyles = "relative font-semibold rounded-full transition-all duration-200 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95";
  
  const variants = {
    primary: "bg-yellow-400 hover:bg-yellow-500 text-gray-900 focus:ring-yellow-400 shadow-[0_4px_14px_0_rgba(250,204,21,0.39)] hover:shadow-[0_6px_20px_rgba(250,204,21,0.23)] border border-yellow-400",
    secondary: "bg-slate-800 hover:bg-slate-700 text-white focus:ring-slate-500 shadow-lg shadow-slate-800/20",
    danger: "bg-red-500 hover:bg-red-600 text-white focus:ring-red-500 shadow-lg shadow-red-500/30",
    ghost: "bg-transparent hover:bg-gray-100 text-gray-600 hover:text-gray-900",
    pulse: "bg-green-600 hover:bg-green-700 text-white animate-pulse shadow-lg hover:animate-none ring-4 ring-green-600/20",
    glass: "bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border border-white/30 shadow-lg",
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
    xl: "px-10 py-5 text-xl",
  };

  const widthStyle = fullWidth ? "w-full" : "";

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthStyle} ${className}`}
      {...props}
    >
      {icon && <span className="w-5 h-5">{icon}</span>}
      {children}
    </button>
  );
};