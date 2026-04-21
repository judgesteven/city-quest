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

1. Start the dev server with `npm run dev` (it listens on `0.0.0.0`).
2. Open the **network URL** shown in the terminal from your phone on the same Wi-Fi.
3. Allow location when the browser prompts; the map should follow your position.

## Stack

- React
- TypeScript
- Vite
- `vite-plugin-pwa`

