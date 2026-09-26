# T-152d — landing topbar on phones

Before: `topbar__320__light__before.png`, `topbar__390__light__before.png`
(taken before the change, same e2e build, clipped to the topbar). The
"Mercampus" wordmark runs under "Español"; at 320px the explore button runs
off the right edge.

Measured before (left/right edges in px, from `getBoundingClientRect`):

| Width | Wordmark | Switcher | Button |
| --- | --- | --- | --- |
| 320 | 48-159 | 135-253 | 265-348 (off screen) |
| 390 | 57-167 | 143-259 | 271-368 |

After (button hidden below `sm`, logo `shrink-0`):

| Width | Wordmark | Switcher | Page scrollWidth |
| --- | --- | --- | --- |
| 320 | 48-159 | 187-304 | 320 |
| 390 | 56-167 | 249-367 | 390 |

Screenshots, light and dark: `topbar__{320,390,640}__{light,dark}__after.png`
(topbar only) and `home__390__{light,dark}__after.png` (full first screen,
showing the hero's "Explorar productos" is right there). At 640px the button
is back in the topbar.
