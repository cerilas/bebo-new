import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

type LogoProps = {
  variant?: 'light' | 'dark' | 'auto';
  size?: 'sm' | 'md' | 'lg';
  scrollProgress?: number; // 0 to 100
  className?: string;
};

export const Logo = ({ variant = 'auto', size = 'md', className = '' }: LogoProps) => {
  const { theme, forcedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sizeClasses = {
    sm: 'h-6 md:h-8',
    md: 'h-8 md:h-10',
    lg: 'h-10 md:h-12',
  };

  // Determine which logo to use based on variant and actual theme
  // If variant is 'dark' (default for subpages) but theme is 'dark', use 'light' (white logo)
  const currentTheme = forcedTheme || theme;
  const isActuallyDark = mounted && currentTheme === 'dark';

  const logoSrc = (variant === 'dark' && !isActuallyDark)
    ? '/assets/images/birebiro-logo-black.svg'
    : '/assets/images/birebiro-logo-white.svg';

  return (
    <div className={`group relative -ml-[5px] flex items-center ${className}`}>
      {/* Main Logo Image */}
      <img
        src={logoSrc}
        alt="birebiro"
        className={`w-auto transition-all duration-300 ${sizeClasses[size]}`}
      />
    </div>
  );
};
