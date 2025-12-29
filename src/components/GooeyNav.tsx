'use client';

import { useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';

type GooeyNavItem = {
  label: string;
  href?: string;
  onClick?: () => void;
};

export type GooeyNavProps = {
  items: GooeyNavItem[];
  animationTime?: number;
  particleCount?: number;
  particleDistances?: [number, number];
  particleR?: number;
  timeVariance?: number;
  colors?: number[];
  initialActiveIndex?: number;
  variant?: 'light' | 'dark';
};

const DEFAULT_PARTICLE_DISTANCES: [number, number] = [90, 10];
const DEFAULT_COLORS = [1, 2, 3, 1, 2, 3, 1, 4];

const GooeyNav: React.FC<GooeyNavProps> = ({
  items,
  animationTime = 600,
  particleCount = 15,
  particleDistances = DEFAULT_PARTICLE_DISTANCES,
  particleR = 100,
  timeVariance = 300,
  colors = DEFAULT_COLORS,
  initialActiveIndex = 0,
  variant = 'light',
}) => {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLUListElement>(null);
  const filterRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [activeIndex, setActiveIndex] = useState<number>(initialActiveIndex);

  const noise = (n = 1) => n / 2 - Math.random() * n;
  const getXY = (distance: number, pointIndex: number, totalPoints: number): [number, number] => {
    const angle = ((360 + noise(8)) / totalPoints) * pointIndex * (Math.PI / 180);
    return [distance * Math.cos(angle), distance * Math.sin(angle)];
  };
  const createParticle = (i: number, t: number, d: [number, number], r: number) => {
    const rotate = noise(r / 10);
    return {
      start: getXY(d[0], particleCount - i, particleCount),
      end: getXY(d[1] + noise(7), particleCount - i, particleCount),
      time: t,
      scale: 1 + noise(0.2),
      color: colors[Math.floor(Math.random() * colors.length)],
      rotate: rotate > 0 ? (rotate + r / 20) * 10 : (rotate - r / 20) * 10,
    };
  };
  const makeParticles = (element: HTMLElement) => {
    const d: [number, number] = particleDistances;
    const r = particleR;
    const bubbleTime = animationTime * 2 + timeVariance;
    element.style.setProperty('--time', `${bubbleTime}ms`);
    for (let i = 0; i < particleCount; i++) {
      const t = animationTime * 2 + noise(timeVariance * 2);
      const p = createParticle(i, t, d, r);
      element.classList.remove('active');
      setTimeout(() => {
        const particle = document.createElement('span');
        const point = document.createElement('span');
        particle.classList.add('particle');
        particle.style.setProperty('--start-x', `${p.start[0]}px`);
        particle.style.setProperty('--start-y', `${p.start[1]}px`);
        particle.style.setProperty('--end-x', `${p.end[0]}px`);
        particle.style.setProperty('--end-y', `${p.end[1]}px`);
        particle.style.setProperty('--time', `${p.time}ms`);
        particle.style.setProperty('--scale', `${p.scale}`);
        particle.style.setProperty('--color', `var(--color-${p.color}, white)`);
        particle.style.setProperty('--rotate', `${p.rotate}deg`);
        point.classList.add('point');
        particle.appendChild(point);
        element.appendChild(particle);
        requestAnimationFrame(() => {
          element.classList.add('active');
        });
        setTimeout(() => {
          try {
            element.removeChild(particle);
          } catch { }
        }, t);
      }, 30);
    }
  };
  const updateEffectPosition = (element: HTMLElement) => {
    if (!containerRef.current || !filterRef.current || !textRef.current) {
      return;
    }
    const containerRect = containerRef.current.getBoundingClientRect();
    const pos = element.getBoundingClientRect();
    const styles = {
      left: `${pos.x - containerRect.x}px`,
      top: `${pos.y - containerRect.y}px`,
      width: `${pos.width}px`,
      height: `${pos.height}px`,
    };
    Object.assign(filterRef.current.style, styles);
    Object.assign(textRef.current.style, styles);
    textRef.current.textContent = element.textContent;
  };
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>, index: number, item: GooeyNavItem) => {
    e.preventDefault();
    const liEl = e.currentTarget.parentElement as HTMLElement;
    if (activeIndex === index) {
      // If clicking the same item, still execute the action
      if (item.onClick) {
        item.onClick();
      } else if (item.href) {
        // Use window.location for full page reload to reset state
        window.location.href = item.href;
      }
      return;
    }
    setActiveIndex(index);
    updateEffectPosition(liEl);
    if (filterRef.current) {
      const particles = filterRef.current.querySelectorAll('.particle');
      particles.forEach(p => filterRef.current!.removeChild(p));
    }
    if (textRef.current) {
      textRef.current.classList.remove('active');
      void textRef.current.offsetWidth;
      textRef.current.classList.add('active');
    }
    if (filterRef.current) {
      makeParticles(filterRef.current);
    }
    // Execute onClick after animation starts
    setTimeout(() => {
      if (item.onClick) {
        item.onClick();
      } else if (item.href) {
        router.push(item.href);
      }
    }, 100);
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLAnchorElement | HTMLButtonElement>, index: number, item: GooeyNavItem) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const liEl = e.currentTarget.parentElement;
      if (liEl) {
        handleClick(
          {
            currentTarget: liEl,
            preventDefault: () => { },
          } as React.MouseEvent<HTMLAnchorElement>,
          index,
          item,
        );
      }
    }
  };

  useEffect(() => {
    if (!navRef.current || !containerRef.current) {
      return;
    }
    const activeLi = navRef.current.querySelectorAll('li')[activeIndex] as HTMLElement;
    if (activeLi) {
      updateEffectPosition(activeLi);
      textRef.current?.classList.add('active');
    }
    const resizeObserver = new ResizeObserver(() => {
      const currentActiveLi = navRef.current?.querySelectorAll('li')[activeIndex] as HTMLElement;
      if (currentActiveLi) {
        updateEffectPosition(currentActiveLi);
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [activeIndex]);

  // Inject styles client-side to avoid hydration errors
  useEffect(() => {
    const textColor = variant === 'light' ? 'white' : 'black';
    const darkTextColor = variant === 'light' ? 'white' : 'white'; // Always white in dark mode for GooeyNav
    const activeTextColor = variant === 'light' ? 'black' : 'white';
    const darkActiveTextColor = variant === 'light' ? 'black' : 'black';
    const activeBg = variant === 'light' ? 'white' : 'black';
    const darkActiveBg = variant === 'light' ? 'white' : 'white';

    const styleId = 'gooey-nav-styles';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement;

    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    styleEl.textContent = `
      :root {
        --linear-ease: linear(0, 0.068, 0.19 2.7%, 0.804 8.1%, 1.037, 1.199 13.2%, 1.245, 1.27 15.8%, 1.274, 1.272 17.4%, 1.249 19.1%, 0.996 28%, 0.949, 0.928 33.3%, 0.926, 0.933 36.8%, 1.001 45.6%, 1.013, 1.019 50.8%, 1.018 54.4%, 1 63.1%, 0.995 68%, 1.001 85%, 1);
        --gooey-text: ${textColor};
        --gooey-active-text: ${activeTextColor};
        --gooey-active-bg: ${activeBg};
      }
      .dark {
        --gooey-text: ${darkTextColor};
        --gooey-active-text: ${darkActiveTextColor};
        --gooey-active-bg: ${darkActiveBg};
      }
      .gooey-effect {
        position: absolute;
        opacity: 1;
        pointer-events: none;
        display: grid;
        place-items: center;
        z-index: 1;
      }
      .gooey-effect.text {
        color: var(--gooey-text);
        transition: color 0.3s ease;
      }
      .gooey-effect.text.active {
        color: var(--gooey-active-text);
      }
      .gooey-effect.filter {
        filter: blur(7px) contrast(100) blur(0);
        mix-blend-mode: lighten;
      }
      .gooey-effect.filter::after {
        content: "";
        position: absolute;
        inset: 0;
        background: var(--gooey-active-bg);
        transform: scale(0);
        opacity: 0;
        z-index: -1;
        border-radius: 9999px;
      }
      .gooey-effect.active::after {
        animation: pill 0.3s ease both;
      }
      @keyframes pill {
        to {
          transform: scale(1);
          opacity: 1;
        }
      }
      .particle,
      .point {
        display: block;
        opacity: 0;
        width: 20px;
        height: 20px;
        border-radius: 9999px;
        transform-origin: center;
      }
      .particle {
        --time: 5s;
        position: absolute;
        top: calc(50% - 8px);
        left: calc(50% - 8px);
        animation: particle calc(var(--time)) ease 1 -350ms;
      }
      .point {
        background: var(--color);
        opacity: 1;
        animation: point calc(var(--time)) ease 1 -350ms;
      }
      @keyframes particle {
        0% {
          transform: rotate(0deg) translate(calc(var(--start-x)), calc(var(--start-y)));
          opacity: 1;
          animation-timing-function: cubic-bezier(0.55, 0, 1, 0.45);
        }
        70% {
          transform: rotate(calc(var(--rotate) * 0.5)) translate(calc(var(--end-x) * 1.2), calc(var(--end-y) * 1.2));
          opacity: 1;
          animation-timing-function: ease;
        }
        85% {
          transform: rotate(calc(var(--rotate) * 0.66)) translate(calc(var(--end-x)), calc(var(--end-y)));
          opacity: 1;
        }
        100% {
          transform: rotate(calc(var(--rotate) * 1.2)) translate(calc(var(--end-x) * 0.5), calc(var(--end-y) * 0.5));
          opacity: 1;
        }
      }
      @keyframes point {
        0% {
          transform: scale(0);
          opacity: 0;
          animation-timing-function: cubic-bezier(0.55, 0, 1, 0.45);
        }
        25% {
          transform: scale(calc(var(--scale) * 0.25));
        }
        38% {
          opacity: 1;
        }
        65% {
          transform: scale(var(--scale));
          opacity: 1;
          animation-timing-function: ease;
        }
        85% {
          transform: scale(var(--scale));
          opacity: 1;
        }
        100% {
          transform: scale(0);
          opacity: 0;
        }
      }
      .gooey-nav-item.active {
        color: var(--gooey-active-text);
        text-shadow: none;
      }
      .gooey-nav-item.active::after {
        opacity: 1;
        transform: scale(1);
      }
      .gooey-nav-item::after {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: 8px;
        background: var(--gooey-active-bg);
        opacity: 0;
        transform: scale(0);
        transition: all 0.3s ease;
        z-index: -1;
      }
    `;
  }, [variant]);

  const useThemeVariables = variant === 'dark';
  const displayTextColor = useThemeVariables ? 'var(--gooey-text)' : (variant === 'light' ? 'white' : 'black');

  return (
    <div className="relative" ref={containerRef}>
      <nav className="relative flex" style={{ transform: 'translate3d(0,0,0.01px)' }}>
        <ul
          ref={navRef}
          className="relative z-[3] m-0 flex list-none gap-8 p-0 px-4"
          style={{
            color: displayTextColor,
            textShadow: variant === 'light' ? '0 1px 1px hsl(205deg 30% 10% / 0.2)' : 'none',
          }}
        >
          {items.map((item, index) => (
            <li
              key={index}
              className={`gooey-nav-item ease relative cursor-pointer rounded-full shadow-[0_0_0.5px_1.5px_transparent] transition-[background-color_color_box-shadow] duration-300 ${activeIndex === index ? 'active' : ''
              }`}
              style={{ color: displayTextColor }}
            >
              {item.href
                ? (
                    <a
                      href={item.href}
                      onClick={e => handleClick(e, index, item)}
                      onKeyDown={e => handleKeyDown(e, index, item)}
                      className="inline-block px-[1em] py-[0.6em] outline-none"
                    >
                      {item.label}
                    </a>
                  )
                : (
                    <button
                      type="button"
                      onClick={e => handleClick(e, index, item)}
                      onKeyDown={e => handleKeyDown(e, index, item)}
                      className="inline-block px-[1em] py-[0.6em] outline-none"
                    >
                      {item.label}
                    </button>
                  )}
            </li>
          ))}
        </ul>
      </nav>
      <span className="gooey-effect" ref={filterRef} />
      <span className="gooey-effect text" ref={textRef} />
    </div>
  );
};

export default GooeyNav;
