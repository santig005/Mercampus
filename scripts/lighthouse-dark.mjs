#!/usr/bin/env node
// T-73. Cross-platform shortcut for running lighthouse.mjs with
// LIGHTHOUSE_THEME=dark: la sintaxis `VAR=valor comando` de bash no
// work in cmd.exe/PowerShell (this repo's development environment), so this
// sets the env var on the process before importing the real script, rather
// than depending on the shell's syntax.
process.env.LIGHTHOUSE_THEME = 'dark';
await import('./lighthouse.mjs');
