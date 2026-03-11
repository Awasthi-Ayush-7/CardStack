/**
 * Build-time configuration flags.
 * REACT_APP_STATIC_MODE=true → no backend, card data is bundled, user data in localStorage.
 * Inlined at build time by CRA (dead code is tree-shaken in production).
 */
export const IS_STATIC = process.env.REACT_APP_STATIC_MODE === 'true';
