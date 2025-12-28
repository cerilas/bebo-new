'use client';

import gsap from 'gsap';
import { useEffect, useRef, useState } from 'react';

const ROTATING_WORDS = ['Aklındaki', 'Hayalindeki', 'Fikrindeki'];

export function RotatingTextLoader({
  onComplete,
  finishFast,
}: {
  onComplete: () => void;
  finishFast: boolean;
}) {
  const [completed, setCompleted] = useState(false);
  const wordsRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    if (!wordsRef.current) {
      return;
    }

    const words = wordsRef.current.children;
    const totalWords = words.length;
    const wordHeight = 60; // Increased for larger text

    // Initial setup
    gsap.set(wordsRef.current, { y: 0 });

    const tl = gsap.timeline({
      repeat: -1,
      defaults: { duration: 0.5, ease: 'power2.inOut' },
    });

    timelineRef.current = tl;

    // Create the rolling loop
    for (let i = 0; i < totalWords; i++) {
      tl.to(wordsRef.current, {
        y: -(i * wordHeight),
        delay: 0.1, // Fast rotation
      });
    }

    // Reset to top seamlessly
    tl.set(wordsRef.current, { y: 0 });

    return () => {
      tl.kill();
    };
  }, []);

  useEffect(() => {
    if (finishFast && !completed) {
      // Speed up or finish animation
      if (timelineRef.current) {
        timelineRef.current.timeScale(3);

        // After a short while, fade out and call onComplete
        const timer = setTimeout(() => {
          setCompleted(true);
          gsap.to(containerRef.current, {
            opacity: 0,
            duration: 0.5,
            ease: 'power2.inOut',
            onComplete,
          });
        }, 800);
        return () => clearTimeout(timer);
      }
      onComplete();
    }
    return undefined;
  }, [finishFast, onComplete, completed]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0a0a0f] text-white"
    >
      <div className="bg-gradient-radial absolute inset-0 from-[#1a1a2e] to-black opacity-50" />

      <div className="relative flex items-center gap-3 text-3xl font-bold md:text-5xl lg:text-6xl">
        {/* Rotating Part */}
        <div className="relative h-[60px] overflow-hidden text-right sm:min-w-[280px]" style={{ minWidth: '240px' }}>
          <div ref={wordsRef} className="flex flex-col items-end">
            {ROTATING_WORDS.map((word, i) => (
              <div
                key={i}
                className="flex h-[60px] items-center bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent"
              >
                {word}
              </div>
            ))}
            <div className="flex h-[60px] items-center bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
              {ROTATING_WORDS[0]}
            </div>
          </div>
        </div>

        {/* Fixed Part - Brand Logo */}
        <div className="flex h-[60px] items-center">
          <img
            src="/assets/images/birebiro-logo-white.svg"
            alt="birebiro"
            className="h-10 w-auto md:h-12 lg:h-16"
          />
        </div>
      </div>
    </div>
  );
}
