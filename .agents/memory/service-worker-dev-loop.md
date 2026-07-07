---
name: Service worker dev reload loop
description: Registering a kill-switch SW unconditionally (including in dev) causes an infinite page-reload loop.
---

## Rule
Only register the service worker when `!__DEV__`:

```tsx
if (!__DEV__ && Platform.OS === 'web' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
```

**Why:** A kill-switch SW (one that calls `self.registration.unregister()` + `client.navigate()` on activate) unregisters itself and reloads the page. If the registration call is unconditional, every page load immediately re-registers the kill-switch, which activates again, unregisters, reloads — infinite loop. The kill-switch sw.js pattern should only be used transiently in production to clear a broken SW, never in dev.

**How to apply:** Use `!__DEV__` guard for all SW registration. The kill-switch sw.js was used here to clear stale v1 cache-first SW registrations from a browser session. Once cleared, replace with a normal network-first or stale-while-revalidate SW for production caching.
