# Mosta3lem app

React Native app built with Expo (SDK 57) and Expo Router. One app for both sides: service providers (company owners, supervisors, field agents and individual providers) sign in with their mobile, and organisations that request investigations or collections (Admin, Operations, Investigations, Collections) sign in with their work email. The sign-in decides which part of the app opens.

## Run it

```bash
cd app
npm install
npx expo start
```

- **On your phone:** install **Expo Go** from the App Store or Google Play, connect the phone to the same Wi-Fi as the computer, then scan the QR code shown in the terminal.
- **In a browser:** press `w` in the terminal, or run `npx expo start --web`.

Sign in with a provider's mobile number. The SMS code is simulated and shown on screen. You can also tap **Demo accounts** to sign in as any provider user.

### With the real server

Copy `.env.example` to `.env.local` and set `EXPO_PUBLIC_API_URL` to the API (start it in `../backend` with `npm start`). On a phone use the computer's Wi-Fi address, for example `http://192.168.1.20:4000`, not `localhost`. Restart Expo after changing it.

- Codes are real: the server sends them by SMS (providers) or email (organisations). On a test server nothing is really sent: the code is in the API's log.
- New providers confirm their mobile with a server code before the application is accepted.
- "Forgot your password?" emails a link; organisation users choose their password on the console's `/set-password` page.
- The sign-in is kept in the phone's secure storage (the browser's storage on web).
- Push notifications register after sign-in on a real phone with a development or store build and an EAS project id (`expo.extra.eas.projectId`). Expo Go on Android cannot receive remote push; without push, email and SMS still reach people.
- Demo accounts are offered only when the server holds demo data; resetting demo data is only offered on the device's own demo.

Without `EXPO_PUBLIC_API_URL` the app runs on its own demo data, as before.

## How it is built

- `src/app/`: screens (Expo Router). `(provider)/` holds the tabs: Home, Offers, Cases (or My tasks), Team, More.
- `src/components/`: case views, the form renderer (report templates, document scans, signatures, references, coverage) and bottom sheets.
- `src/ui/`: the UI kit. Every component mirrors itself for Arabic.
- `src/backend/engine.ts`: the **backend**. It loads the prototype's engine (`../prototype/js`). With `EXPO_PUBLIC_API_URL` every service call goes to the API (`prototype/js/services/remote.js`); without it the engine runs inside the app on demo data saved on the device. Screens only call `services()` either way.
- `src/lib/push.ts`: push notification sign-up with the API.
- `src/i18n/strings.ts`: the app's own English and Arabic text. Shared text comes from the prototype dictionaries.

## Checks

```bash
npx tsc --noEmit           # types
npx expo lint              # lint
node scripts/i18n-check.js # every text key exists in English and Arabic
```

## Simulated for now

- OCR of ID cards, commercial registers and tax cards.
- Sending SMS and email (the server's development messenger stands in until providers are chosen).

On the device's own demo data, the sign-in codes and storage are simulated too.
