import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

const RELOAD_FLAG = 'streetrise-chunk-reloaded'

/** sessionStorage throws in some private-browsing modes; never let that break routing. */
function flag(op: 'get' | 'set' | 'clear'): boolean {
  try {
    if (op === 'get')   return sessionStorage.getItem(RELOAD_FLAG) === '1'
    if (op === 'set')   { sessionStorage.setItem(RELOAD_FLAG, '1'); return true }
    sessionStorage.removeItem(RELOAD_FLAG)
    return true
  } catch {
    return false
  }
}

/**
 * `React.lazy` that survives a deploy landing under an open tab.
 *
 * Every route in this app is code-split, and Vite gives each chunk a
 * content-hashed filename. When a new build ships, the old filenames stop
 * existing — so a tab still running the previous bundle asks for a chunk that
 * is now a 404, the dynamic import rejects, and because a rejected lazy import
 * is not something Suspense can handle, React unmounts the tree. The result is
 * a completely blank page with nothing in the console but a failed request.
 *
 * That is especially easy to hit here: the PWA service worker keeps the old
 * app shell alive on a phone long after a deploy, so the stale tab can live for
 * days. It also only ever bites *newly added* routes, which is why it looks
 * like "this one new page is broken" rather than "the site is broken".
 *
 * One reload fixes it — the browser fetches the new index.html and its new
 * chunk names. The session flag makes sure a genuinely missing chunk (a real
 * build error) fails loudly on the second attempt instead of reload-looping.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithReload<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const mod = await factory()
      flag('clear')          // loaded fine — arm the retry for next time
      return mod
    } catch (err) {
      if (!flag('get') && flag('set')) {
        window.location.reload()
        // Deliberately never settles: the reload replaces this document, and
        // resolving here would flash a broken render on the way out.
        return new Promise<{ default: T }>(() => {})
      }
      throw err
    }
  })
}
