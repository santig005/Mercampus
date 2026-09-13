'use client';
import { useEffect, useMemo, useState } from 'react';

// F46 (docs/audits/t-67/findings.md): react-select paints its control, menu
// and option colors as inline styles, so Tailwind's `dark:` variants (and
// daisyUI's own theme switch) never reach it - it stays white-on-white next
// to every other themed surface once dark mode is on. The fix that actually
// works is react-select's own `styles` prop, so this hook feeds it real,
// live colors.
//
// Rather than hand-copying tailwind.config.js's palette into JS (a second
// place to update if the theme ever changes), this reads the *live* daisyUI
// colors straight out of the DOM: a hidden probe carries the same
// `bg-base-100`/`text-base-content`/etc. classes the rest of the app uses,
// and `getComputedStyle` resolves whatever daisyUI 4 actually renders them
// as today (currently raw oklch() components behind CSS variables - see
// `docs/audits/t-67/README.md`'s note on why a naive `rgb()`-only contrast
// checker misreads them) into a real, usable color string.

const FALLBACK_COLORS = {
  base100: '#ffffff',
  base200: '#F2F2F2',
  base300: '#E5E6E6',
  baseContent: '#1f2937',
  primary: '#FF7622',
  primaryContent: '#ffffff',
};

function readThemeColors() {
  if (typeof document === 'undefined') return FALLBACK_COLORS;

  const probe = document.createElement('div');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.position = 'absolute';
  probe.style.pointerEvents = 'none';
  probe.style.opacity = '0';
  probe.innerHTML = `
    <div data-role="base-100" class="bg-base-100 text-base-content"></div>
    <div data-role="base-200" class="bg-base-200"></div>
    <div data-role="base-300" class="bg-base-300"></div>
    <div data-role="primary" class="bg-primary text-primary-content"></div>
  `;
  document.body.appendChild(probe);

  const styleOf = role => getComputedStyle(probe.querySelector(`[data-role="${role}"]`));
  const colors = {
    base100: styleOf('base-100').backgroundColor,
    base200: styleOf('base-200').backgroundColor,
    base300: styleOf('base-300').backgroundColor,
    baseContent: styleOf('base-100').color,
    primary: styleOf('primary').backgroundColor,
    primaryContent: styleOf('primary').color,
  };

  document.body.removeChild(probe);
  return colors;
}

// Tracks `<html data-theme>` at runtime - the same attribute ThemeToggle
// flips on click and layout.jsx's anti-FOUC script sets on load - so
// consumers re-render on a theme change without a full page reload. A
// MutationObserver, not a click listener, because the toggle isn't the only
// thing that can change it (the anti-FOUC script also accepts a `?theme=`
// query param).
function useThemeAttribute() {
  const [theme, setTheme] = useState(() =>
    typeof document !== 'undefined'
      ? document.documentElement.getAttribute('data-theme') || 'light'
      : 'light'
  );

  useEffect(() => {
    const root = document.documentElement;
    setTheme(root.getAttribute('data-theme') || 'light');

    const observer = new MutationObserver(() => {
      setTheme(root.getAttribute('data-theme') || 'light');
    });
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  return theme;
}

// react-select's `styles` prop: one function per part, each merging into the
// library's own base style. Re-derived whenever the theme flips.
export function useReactSelectStyles() {
  const theme = useThemeAttribute();

  return useMemo(() => {
    const colors = readThemeColors();

    return {
      control: (base, state) => ({
        ...base,
        backgroundColor: colors.base100,
        borderColor: state.isFocused ? colors.primary : colors.base300,
        color: colors.baseContent,
        boxShadow: 'none',
        '&:hover': { borderColor: colors.primary },
      }),
      menu: base => ({
        ...base,
        backgroundColor: colors.base100,
        color: colors.baseContent,
        zIndex: 20,
      }),
      menuList: base => ({ ...base, backgroundColor: colors.base100 }),
      option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected
          ? colors.primary
          : state.isFocused
            ? colors.base200
            : colors.base100,
        color: state.isSelected ? colors.primaryContent : colors.baseContent,
      }),
      singleValue: base => ({ ...base, color: colors.baseContent }),
      input: base => ({ ...base, color: colors.baseContent }),
      placeholder: base => ({ ...base, color: colors.baseContent, opacity: 0.6 }),
      multiValue: base => ({ ...base, backgroundColor: colors.base200 }),
      multiValueLabel: base => ({ ...base, color: colors.baseContent }),
      multiValueRemove: base => ({
        ...base,
        color: colors.baseContent,
        ':hover': { backgroundColor: colors.primary, color: colors.primaryContent },
      }),
      indicatorSeparator: base => ({ ...base, backgroundColor: colors.base300 }),
      dropdownIndicator: base => ({ ...base, color: colors.baseContent }),
      clearIndicator: base => ({ ...base, color: colors.baseContent }),
    };
    // `theme` isn't read in this body - it's the signal to re-run
    // readThemeColors() when data-theme flips, not a value used directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);
}
