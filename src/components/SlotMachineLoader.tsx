'use client';

import gsap from 'gsap';
import {
  Award,
  Globe,
  Heart,
  Layers,
  type LucideIcon,
  Package,
  Palette,
  Shield,
  Smartphone,
  Star,
  Truck,
  Zap,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

// Configuration
const ICON_SIZE = 80; // Icon visual size
const SLOT_HEIGHT = 120; // Height of each slot
const ANIMATION_DURATION = 1.5; // Base duration in seconds

// Filler icons
const FILLER_ICONS = [Zap, Star, Heart, Award, Shield, Globe, Smartphone, Layers];

// Target icons for each column
const TARGET_ICONS = [Package, Palette, Truck];

type IconItem =
  | { type: 'logo'; key: string; component?: never }
  | { type: 'icon'; component: LucideIcon; key: string }
  | { type: 'target'; component: LucideIcon; key: string };

export function SlotMachineLoader({
  onComplete,
  finishFast,
}: {
  onComplete: () => void;
  finishFast: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [completedReels, setCompletedReels] = useState(0);
  const animationStarted = useRef(false);

  // Generate icons for a reel
  const generateReelIcons = (columnIndex: number): IconItem[] => {
    const icons: IconItem[] = [];
    const count = 20 + (columnIndex * 8); // More icons for later columns

    for (let i = 0; i < count; i++) {
      // Add logo at start and occasionally throughout
      if (i === 0 || i === 3 || i === 10 || i === 17) {
        icons.push({ type: 'logo', key: `logo-${i}` });
      } else {
        const IconComponent = FILLER_ICONS[i % FILLER_ICONS.length]!;
        icons.push({ type: 'icon', component: IconComponent, key: `filler-${i}` });
      }
    }

    // Add target icon at the end
    icons.push({ type: 'target', component: TARGET_ICONS[columnIndex]!, key: 'target' });

    // Add buffer icons after target
    for (let i = 0; i < 3; i++) {
      const IconComponent = FILLER_ICONS[i % FILLER_ICONS.length]!;
      icons.push({ type: 'icon', component: IconComponent, key: `buffer-${i}` });
    }

    return icons;
  };

  useEffect(() => {
    if (finishFast) {
      gsap.globalTimeline.timeScale(4);
    } else {
      gsap.globalTimeline.timeScale(1);
    }
    return () => {
      gsap.globalTimeline.timeScale(1);
    };
  }, [finishFast]);

  useEffect(() => {
    if (animationStarted.current) {
      return;
    }
    animationStarted.current = true;

    // Small delay to ensure DOM is ready
    const startAnimation = () => {
      reelRefs.current.forEach((reel, index) => {
        if (!reel) {
          return;
        }

        const icons = generateReelIcons(index);
        const targetIndex = icons.findIndex(icon => icon.type === 'target');

        // Calculate final position
        const containerHeight = reel.parentElement?.clientHeight || 400;
        const targetPosition = targetIndex * SLOT_HEIGHT;
        const centerOffset = (containerHeight - SLOT_HEIGHT) / 2;
        const finalY = -(targetPosition - centerOffset);

        // Animate with staggered start
        gsap.to(reel, {
          y: finalY,
          duration: ANIMATION_DURATION + (index * 0.4),
          delay: index * 0.3,
          ease: 'power2.out',
          onComplete: () => {
            setCompletedReels(prev => prev + 1);
          },
        });
      });
    };

    // Wait a bit for DOM
    setTimeout(startAnimation, 100);
  }, []);

  // Handle completion
  useEffect(() => {
    if (completedReels >= 3) {
      setTimeout(onComplete, 500);
    }
  }, [completedReels, onComplete]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] flex max-w-full items-center justify-center gap-2 overflow-hidden bg-[#0a0a0f] p-2"
    >
      {/* Background */}
      <div className="bg-gradient-radial absolute inset-0 from-[#1a1a2e] to-black" />

      {/* Three reels */}
      {[0, 1, 2].map((columnIndex) => {
        const icons = generateReelIcons(columnIndex);

        return (
          <div
            key={columnIndex}
            className="relative h-[50vh] w-20 overflow-hidden rounded-lg border border-white/10 bg-[#0f0f18] sm:w-28 md:w-32"
          >
            {/* Selection window */}
            <div
              className="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 border-y-2 border-purple-500/50 bg-purple-500/10"
              style={{ height: SLOT_HEIGHT }}
            />

            {/* Reel content */}
            <div
              ref={(el) => {
                reelRefs.current[columnIndex] = el;
              }}
              className="will-change-transform"
            >
              {icons.map((icon) => {
                if (icon.type === 'logo') {
                  return (
                    <div
                      key={icon.key}
                      className="flex items-center justify-center"
                      style={{ height: SLOT_HEIGHT }}
                    >
                      <img
                        src="/assets/images/birebiro-logo-white.svg"
                        alt="birebiro"
                        className="h-8 w-auto opacity-40"
                      />
                    </div>
                  );
                }

                const IconComponent = icon.component;
                return (
                  <div
                    key={icon.key}
                    className="flex items-center justify-center"
                    style={{ height: SLOT_HEIGHT }}
                  >
                    <IconComponent
                      size={icon.type === 'target' ? ICON_SIZE : ICON_SIZE * 0.7}
                      className={icon.type === 'target' ? 'text-purple-400' : 'text-gray-600 opacity-40'}
                      strokeWidth={1.5}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
