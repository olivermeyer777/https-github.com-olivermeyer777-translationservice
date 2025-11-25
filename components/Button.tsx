
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'pulse' | 'glass' | 'post-yellow';
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
  const baseStyles = "relative font-bold transition-all duration-200 flex items-center justify-center gap-2 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";
  
  const variants = {
    primary: "bg-[#FFCC00] hover:bg-[#ffda33] text-black rounded-sm border-b-2 border-yellow-500",
    "post-yellow": "bg-[#FFCC00] text-black hover:brightness-105 rounded-none",
    secondary: "bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-sm",
    danger: "bg-red-600 hover:bg-red-700 text-white rounded-full",
    ghost: "bg-transparent hover:bg-gray-100 text-gray-600 hover:text-gray-900 rounded-md",
    pulse: "bg-green-600 hover:bg-green-700 text-white animate-pulse rounded-full",
    glass: "bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/20 rounded-full",
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
