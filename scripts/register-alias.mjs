// Punto de entrada para `node --import`. Registra los hooks de alias-hooks.mjs
// antes de que se cargue el script principal.
import { register } from 'node:module';

register('./alias-hooks.mjs', import.meta.url);
