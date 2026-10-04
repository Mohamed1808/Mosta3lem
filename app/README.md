# Mosta3lem app

React Native app built with Expo (SDK 57) and Expo Router. Service providers use it today: company owners, supervisors, field agents and individual providers. The requester (bank) side is next.

## Run it

```bash
cd app
npm install
npx expo start
```

- **On your phone:** install **Expo Go** from the App Store or Google Play, connect the phone to the same Wi-Fi as the computer, then scan the QR code shown in the terminal.
- **In a browser:** press `w` in the terminal, or run `npx expo start --web`.

Sign in with a provider's mobile number. The SMS code is simulated and shown on screen. You can also tap **Demo accounts** to sign in as any provider user.

## How it is built

- `src/app/`: screens (Expo Router). `(provider)/` holds the tabs: Home, Offers, Cases (or My tasks), Team, More.
- `src/components/`: case views, the form renderer (report templates, document scans, signatures, references, coverage) and bottom sheets.
- `src/ui/`: the UI kit. Every component mirrors itself for Arabic.
- `src/backend/engine.ts`: the **simulated backend**. It runs the prototype's engine (`../prototype/js`) inside the app, saved on the device. Screens only call `services()`, the same contract the real API will implement, so swapping in the real backend does not change the screens.
- `src/i18n/strings.ts`: the app's own English and Arabic text. Shared text comes from the prototype dictionaries.

## Checks

```bash
npx tsc --noEmit           # types
npx expo lint              # lint
node scripts/i18n-check.js # every text key exists in English and Arabic
```

## Simulated for now

- The SMS code at sign-in.
- GPS at check-in.
- OCR of ID cards, commercial registers and tax cards.
- Data storage, which stays on the device.

Each is replaced when the real backend and providers are chosen.
