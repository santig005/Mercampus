// Entry point for `node --import`. Registers alias-hooks.mjs's hooks before
// the main script is loaded.
import { register } from 'node:module';

register('./alias-hooks.mjs', import.meta.url);
