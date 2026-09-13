'use client';

import { TbMoon, TbSun } from 'react-icons/tb';
import { useEffect, useState } from 'react';

// T-73: a plain string in localStorage, not JSON.stringify as the rest of
// the app does through useLocalStorage - layout.jsx's anti-FOUC script runs
// before React (it can't import anything from here) and needs to read it with
// a single localStorage.getItem. It follows the `data-theme` convention
// daisyUI's own documentation uses for this pattern.
const THEME_STORAGE_KEY = 'theme';

export default function ThemeToggle() {
  // null until the first effect: we don't yet know which theme the anti-FOUC
  // script applied before React mounted.
  const [theme, setTheme] = useState(null);

  useEffect(() => {
    setTheme(document.documentElement.getAttribute('data-theme') || 'light');
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // localStorage can fail (private mode, quota exceeded) - the theme
      // still changes for this load, it just won't persist to the next.
    }
    setTheme(next);
  };

  const isDark = theme === 'dark';

  return (
    <label className='btn-nav flex items-center gap-2 ps-2 cursor-pointer'>
      {isDark ? <TbMoon className='size-5' /> : <TbSun className='size-5' />}
      Modo oscuro
      <input
        type='checkbox'
        className='toggle toggle-sm ms-auto'
        checked={isDark}
        onChange={toggleTheme}
        disabled={theme === null}
        aria-label='Alternar modo oscuro'
      />
    </label>
  );
}
