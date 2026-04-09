'use client';

import { gsap } from 'gsap';
import { useEffect, useRef, useState } from 'react';

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
 * Types once, no delete, no loop. StrictMode-safe (ref-based, no callback deps).
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

  // All mutable state lives in a single ref to avoid stale closure / double-run issues
  const stateRef = useRef({
    text,
    index: 0,
    cancelled: false,
    timerId: null as ReturnType<typeof setTimeout> | null,
  });

  // Cursor blink
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

  // Typing engine — fully ref-driven, immune to StrictMode double-invoke
  useEffect(() => {
    const chars = Array.from(text);
    const s = stateRef.current;

    // Cancel any previous run
    s.cancelled = true;
    if (s.timerId !== null) {
      clearTimeout(s.timerId);
    }

    // Reset for new text
    s.text = text;
    s.index = 0;
    s.cancelled = false;
    setDisplayed('');
    setDone(false);

    const tick = () => {
      if (s.cancelled) {
        return;
      }
      if (s.index >= chars.length) {
        setDone(true);
        onComplete?.();
        return;
      }
      const char = chars[s.index];
      s.index += 1;
      setDisplayed(prev => prev + char);
      s.timerId = setTimeout(tick, typingSpeed);
    };

    // Small initial delay so the message bubble renders first
    s.timerId = setTimeout(tick, 40);

    return () => {
      s.cancelled = true;
      if (s.timerId !== null) {
        clearTimeout(s.timerId);
      }
    };
    // onComplete intentionally excluded — calling it once is enough, no re-run needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, typingSpeed]);

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
