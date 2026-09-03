// Construcción del className de ProductCard y SellerCard según su variant.
//
// Vive fuera de los componentes, en un archivo sin JSX, para poder testearla
// sin pasar por el pipeline de transformación de JSX de Vite: tsconfig.json
// declara "jsx": "preserve" (lo necesita Next, que usa su propio compilador
// SWC en vez de esbuild), y Vite respeta ese ajuste al pie de la letra —
// importar un .jsx real desde un test revienta el análisis de imports de Vite
// con "contains invalid JS syntax" en vez de transformarlo. Un módulo sin
// sintaxis JSX no tropieza con eso.
//
// La variante 'embedded' solo la usan pantallas autenticadas (edición de
// productos, admin de vendedores) que el e2e todavía no puede visitar: no hay
// sesión de Clerk simulada en Playwright. Los tests de este archivo son la
// única red que cubre esa variante hasta que exista.

export function productCardClassName({ variant, isClicked }) {
  const isStandalone = variant === 'standalone';
  return [
    'flex gap-2',
    isStandalone &&
      'bg-white drop-shadow-md p-2 rounded-md cursor-pointer transition-transform duration-300',
    isStandalone && (isClicked ? 'scale-[0.95]' : 'scale-100'),
  ]
    .filter(Boolean)
    .join(' ');
}

export function sellerCardClassName({ variant, isClicked }) {
  const isStandalone = variant === 'standalone';
  return [
    'flex gap-2 p-2 rounded-md cursor-pointer',
    isStandalone && 'bg-white drop-shadow-md transition-transform duration-300',
    isStandalone && (isClicked ? 'scale-[0.95]' : 'scale-100'),
    !isStandalone && 'w-full',
  ]
    .filter(Boolean)
    .join(' ');
}
