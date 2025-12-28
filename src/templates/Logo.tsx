'use client';

type LogoProps = {
  variant?: 'light' | 'dark' | 'auto';
  size?: 'sm' | 'md' | 'lg';
  scrollProgress?: number; // 0 to 100
  className?: string;
};

export const Logo = ({ variant = 'auto', size = 'md', className = '' }: LogoProps) => {
  const sizeClasses = {
    sm: 'h-6 md:h-8',
    md: 'h-8 md:h-10',
    lg: 'h-10 md:h-12',
  };

  // Determine which logo to use based on variant
  const logoSrc = variant === 'dark'
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
