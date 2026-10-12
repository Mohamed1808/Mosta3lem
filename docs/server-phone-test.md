# Phone test with the real server

The app on your phone, talking to the Mosta3lem API on your computer instead of its own demo data. About 20 minutes.

## Setup

1. **Start the API** (first PowerShell window):
   ```
   cd "C:\Users\mmohe\OneDrive\Desktop\Silital Website Claude Code\ICM-Marketplace\backend"
   $env:Path = "C:\Program Files\nodejs;$env:Path"
   npm install
   npm start
   ```
   Leave it open: sign-in codes appear here. If Windows asks whether Node.js may use the network, allow it on **private networks**.

2. **Find your computer's Wi-Fi address** (second window): `ipconfig`, then look for **IPv4 Address** under your Wi-Fi adapter, for example `192.168.1.20`.

3. **Point the app at the API**: in the `app` folder, copy `.env.example` to `.env.local` and set:
   ```
   EXPO_PUBLIC_API_URL=http://192.168.1.20:4000
   ```
   (your own address). The phone must be on the **same Wi-Fi** as the computer.

4. **Start the app** as in the other phone tests (`npx expo start`, or with `--tunnel`) and open it in Expo Go.

5. Check it worked: on the phone's browser, open `http://192.168.1.20:4000/health`. It should show `"ok":true`.

## Codes

No SMS or email is really sent yet. Every code and link appears in the API window, in a line with **[dev messenger]**, for example "Your Mosta3lem code is 559322".

## Checklist

- [ ] **Provider sign-in**: as a provider, type the mobile of a demo provider (tap **Demo accounts** to see names; Hany Wagdy is 01215597389). Type the code from the API window. Home opens with your offers and cases.
- [ ] Accept an offer. Home updates by itself.
- [ ] Close the app completely and open it again: you are still signed in.
- [ ] **More**: there is no "reset demo" button (the data is on the server). **Sign out**.
- [ ] **Organisation sign-in**: Organisation, `nadia.samir@horus-auto.example` and the demo password, then the emailed code from the API window.
- [ ] If home shows "Accept the data processing agreement", tap **Read and accept** and accept it (until then, cases cannot go to providers). Tamer (not an Admin) sees the notice but cannot accept. **More > Data processing agreement** shows who accepted and when.
- [ ] Send a new request. Then on the computer, open the console on the server too (console checklist block 9): the request is there.
- [ ] **Provider sign-up**: Register as a provider, fill the steps with a new mobile. On the last step, **Send code**, type the code from the API window and submit. The application screen opens.
- [ ] A wrong code shows "Wrong code"; after 5 wrong codes, ask for a new one.
- [ ] Stop the API (Ctrl+C in its window) and try an action, for example accepting an offer: the app should say there is no connection to the server. Start the API again and carry on.

Push notifications do not work in Expo Go on Android; they need a proper build (later). Email and SMS stand in.

## Report

For each problem: who you signed in as, which screen, what you did, what you expected, a screenshot, and the last lines of the API window.
