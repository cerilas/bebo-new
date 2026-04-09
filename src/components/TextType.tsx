'use client';

import { gsap } from 'gsap';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type TextTypeProps = {
  text: string;
  typingSpeed?: number;
  showCursor?: boolean;
  cursorCharacter?: string;
  cursorClassName?: string;
  cursorBlinkDuration?: number;
  className?: string;
  onComplete?: () => void;
};

/**
 * Single-string typing effect for AI chat messages.
 * Types once, no delete, no loop.
 */
const TextType = ({
  text,
  typingSpeed = 18,
  showCursor = true,
  cursorCharacter = '▍',
  cursorClassName = '',
  cursorBlinkDuration = 0.5,
  className = '',
  onComplete,
}: TextTypeProps) => {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const indexRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const chars = useMemo(() => Array.from(text), [text]);

  // Cursor blink via gsap
  useEffect(() => {
    if (!showCursor || !cursorRef.current) {
      return undefined;
    }

    gsap.set(cursorRef.current, { opacity: 1 });
    const tween = gsap.to(cursorRef.current, {
      opacity: 0,
      duration: cursorBlinkDuration,
      repeat: -1,
      yoyo: true,
      ease: 'power2.inOut',
    });

    return () => {
      tween.kill();
    };
  }, [showCursor, cursorBlinkDuration]);

  // Hide cursor when done
  useEffect(() => {
    if (done && cursorRef.current) {
      gsap.killTweensOf(cursorRef.current);
      gsap.to(cursorRef.current, { opacity: 0, duration: 0.3, delay: 0.8 });
    }
  }, [done]);

  // Typing loop
  const type = useCallback(() => {
    if (indexRef.current >= chars.length) {
      setDone(true);
      onComplete?.();
      return;
    }
    setDisplayed(prev => prev + chars[indexRef.current]);
    indexRef.current += 1;
    timeoutRef.current = setTimeout(type, typingSpeed);
  }, [chars, typingSpeed, onComplete]);

  useEffect(() => {
    // Reset when text changes (new message)
    setDisplayed('');
    setDone(false);
    indexRef.current = 0;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(type, 40);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [text, type]);

  return (
    <span className={`inline whitespace-pre-wrap ${className}`}>
      <span>{displayed}</span>
      {showCursor && !done && (
        <span
          ref={cursorRef}
          className={`ml-0.5 inline-block ${cursorClassName}`}
        >
          {cursorCharacter}
        </span>
      )}
    </span>
  );
};

export default TextType;
