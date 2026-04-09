'use client';

import { gsap } from 'gsap';
import { useEffect, useMemo, useRef, useState } from 'react';

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
 * Pure state-driven (count-based). No mutations, no ref hacks.
 * Safe under React 18 concurrent mode and StrictMode double-invoke.
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
  const safeText = text ?? '';
  const chars = useMemo(() => Array.from(safeText), [safeText]);
  const [count, setCount] = useState(0);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const done = chars.length > 0 && count >= chars.length;

  // Reset counter whenever text changes
  useEffect(() => {
    setCount(0);
  }, [safeText]);

  // Schedule next character — purely driven by count state
  useEffect(() => {
    if (count >= chars.length) {
      if (chars.length > 0) {
        onCompleteRef.current?.();
      }
      return undefined;
    }
    const delay = count === 0 ? 40 : typingSpeed;
    const timer = setTimeout(() => {
      setCount(c => c + 1);
    }, delay);
    return () => {
      clearTimeout(timer);
    };
  }, [count, chars.length, typingSpeed]);

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

  // Fade cursor out after typing completes
  useEffect(() => {
    if (done && cursorRef.current) {
      gsap.killTweensOf(cursorRef.current);
      gsap.to(cursorRef.current, { opacity: 0, duration: 0.3, delay: 0.8 });
    }
  }, [done]);

  const displayed = useMemo(() => chars.slice(0, count).join(''), [chars, count]);

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
