import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

/** Returns the current theme based on the `dark` class on <html>, and updates on toggle. */
export function useTheme(): Theme {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof document === 'undefined') return 'light';
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    const update = () => setTheme(root.classList.contains('dark') ? 'dark' : 'light');
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return theme;
}
