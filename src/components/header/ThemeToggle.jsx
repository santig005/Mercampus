'use client';

import { TbMoon, TbSun } from 'react-icons/tb';
import { useEffect, useState } from 'react';

// T-73: string plano en localStorage, no JSON.stringify como el resto de
// la app hace en useLocalStorage - el script anti-FOUC de layout.jsx corre
// antes que React (no puede importar nada de aca) y necesita leerlo con un
// solo localStorage.getItem. Sigue la convencion `data-theme` que la propia
// documentacion de daisyUI usa para este patron.
const THEME_STORAGE_KEY = 'theme';

export default function ThemeToggle() {
  // null hasta el primer efecto: todavia no sabemos que tema aplico el
  // script anti-FOUC antes de que React montara.
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
      // localStorage puede fallar (modo privado, cuota llena) - el tema
      // igual cambia para esta carga, solo no persiste para la proxima.
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
