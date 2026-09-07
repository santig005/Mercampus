#!/usr/bin/env node
// T-73. Atajo cross-platform para correr lighthouse.mjs con
// LIGHTHOUSE_THEME=dark: la sintaxis `VAR=valor comando` de bash no
// funciona en cmd.exe/PowerShell (el entorno de desarrollo de este repo),
// asi que esto fija la env var en el proceso antes de importar el script
// real en vez de depender de la sintaxis del shell.
process.env.LIGHTHOUSE_THEME = 'dark';
await import('./lighthouse.mjs');
