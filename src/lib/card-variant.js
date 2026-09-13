// Building the className for ProductCard and SellerCard from their variant.
//
// It lives outside the components, in a file with no JSX, so it can be tested
// without going through Vite's JSX transform: tsconfig.json declares
// "jsx": "preserve" (Next needs that, since it uses its own SWC compiler
// rather than esbuild) and Vite honours that setting to the letter -
// importing a real .jsx from a test blows up Vite's import analysis with
// "contains invalid JS syntax" instead of transforming it. A module with no
// JSX syntax doesn't hit that.
//
// The 'embedded' variant is only used by authenticated screens (product
// editing, seller admin) that the e2e can't visit yet: there is no simulated
// Clerk session in Playwright. This file's tests are the only net covering
// that variant until there is one.

export function productCardClassName({ variant, isClicked }) {
  const isStandalone = variant === 'standalone';
  return [
    'flex gap-2',
    isStandalone &&
      // T-73: bg-base-100/text-base-content instead of a fixed bg-white, so
      // the card follows the dark theme instead of staying white on a dark
      // background.
      'bg-base-100 text-base-content drop-shadow-md p-2 rounded-md cursor-pointer transition-transform duration-300',
    isStandalone && (isClicked ? 'scale-[0.95]' : 'scale-100'),
  ]
    .filter(Boolean)
    .join(' ');
}

export function sellerCardClassName({ variant, isClicked }) {
  const isStandalone = variant === 'standalone';
  return [
    'flex gap-2 p-2 rounded-md cursor-pointer',
    isStandalone &&
      'bg-base-100 text-base-content drop-shadow-md transition-transform duration-300',
    isStandalone && (isClicked ? 'scale-[0.95]' : 'scale-100'),
    !isStandalone && 'w-full',
  ]
    .filter(Boolean)
    .join(' ');
}
