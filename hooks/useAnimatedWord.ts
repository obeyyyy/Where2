// hooks/useAnimatedWord.ts
import { useState, useEffect } from 'react';

interface UseAnimatedWordProps {
  words: readonly string[];
  interval?: number;
}

export function useAnimatedWord({ words, interval = 2000 }: UseAnimatedWordProps) {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const fadeOut = setTimeout(() => setFade(false), interval - 300);
    const timer = setTimeout(() => {
      setIndex((prev) => (prev + 1) % words.length);
      setFade(true);
    }, interval);

    return () => {
      clearTimeout(timer);
      clearTimeout(fadeOut);
    };
  }, [index, interval, words.length]);

  return {
    currentWord: words[index],
    currentIndex: index,
    fade,
  };
}