---
name: Font loading on Expo web
description: useFonts from @expo-google-fonts hangs indefinitely on web in dev; blocking render on it causes permanent blank page.
---

## Rule
Never gate `return null` on `fontsLoaded` for `Platform.OS === 'web'`. Render immediately on web; fonts swap in progressively from system fallback.

```tsx
// CORRECT
if (Platform.OS !== 'web' && !fontsLoaded && !fontError) return null;

// WRONG — causes permanent blank page on web if CDN is slow/blocked
if (!fontsLoaded && !fontError) return null;
```

**Why:** `useFonts` fetches from Google Fonts CDN at runtime. In Replit's dev environment (and any slow network), that fetch hangs with no error and no timeout — `fontsLoaded` stays `false`, `fontError` stays `null` forever. The app renders nothing and shows a blank white screen with no console errors.

**How to apply:** In `app/_layout.tsx` RootLayout, check `Platform.OS !== 'web'` before the blocking return. Also call `SplashScreen.hideAsync()` unconditionally on web mount (useEffect with empty deps) since the native splash API may be a no-op on web.
