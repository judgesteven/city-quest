# City Quest (Web PWA)

City Quest is now a plain React + Vite Progressive Web App.

- No Expo
- No native mobile app dependency
- Opens directly in any mobile browser

## Run Locally

```bash
npm install
npm run dev
```

Vite prints a local URL and a network URL.  
On mobile, open the **network URL** in your phone browser (same Wi-Fi).

## Build

```bash
npm run build
npm run preview
```

## Mobile Testing

1. Start dev server with `npm run dev -- --host`.
2. Open the shown network URL from your phone.
3. Tap **Test Mobile Location** to verify browser geolocation permission works.

## Stack

- React
- TypeScript
- Vite
- `vite-plugin-pwa`

