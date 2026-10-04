# Provider app: phone test checklist

The last step before the provider side is done: try the app on a real phone, in Arabic and English. Each block takes 5 to 10 minutes. Tick what works, and note anything that looks wrong with a screenshot.

## Setup

1. Install **Expo Go** on the phone (App Store or Google Play) and connect the phone to the same Wi-Fi as the computer.
2. On the computer, in the `app` folder (PowerShell):
   ```
   $env:Path = "C:\Program Files\nodejs;$env:Path"
   npm install
   npx expo start
   ```
3. Scan the QR code (Android: from Expo Go; iPhone: with the Camera app).
4. If it does not connect, stop with Ctrl+C and run `npx expo start --tunnel`.

Sign in with **Demo accounts** on the sign-in screen, or type a mobile number below and use the code shown on screen.

| Who | Role | Mobile |
|---|---|---|
| Hany Wagdy | Owner, Sphinx (investigation company) | 01215597389 |
| Salma Reda | Supervisor, Sphinx | 01041726007 |
| Mostafa Ali | Field agent, Sphinx | 01289300428 |
| Adel Morsy | Owner, Recovery Partners (collection company) | 01168744751 |
| Rehab Anwar | Supervisor, Recovery Partners | 01181643566 |
| Tarek Helmy | Field agent, Recovery Partners | 01230160599 |
| Omar Hassan | Individual provider | 01248939063 |

To start over at any point: More, then **Reset demo data**.

## 1. Sign-up (new provider)

- [ ] Sign-in screen: **Register as a provider**. Go through the 5 steps as a company.
- [ ] Wrong tax number (8 digits) is refused; the owner national ID is required.
- [ ] Pick a governorate, then a city; tick coverage areas.
- [ ] Take a photo of a document with the **camera** (allow camera access when asked).
- [ ] Confirm with the code shown on screen; the application screen opens.
- [ ] Use the demo buttons: Operations approves, Management signs off, then **Open the app**.

## 2. Owner (Hany)

- [ ] Home: numbers, "Needs your attention", the commercial register expiry alert.
- [ ] Offers: accept one; decline one with a reason.
- [ ] Assign: pick a case, the agent covering the area is listed first.
- [ ] Team: add a supervisor, add an agent, edit an agent, move an agent.
- [ ] Team: **Start doing field work**, then assign a case to yourself.
- [ ] More, Settings: change a price (sent for approval), approve it with the demo button; change a response time; send a renewed commercial register with a new date.
- [ ] More: Ratings and feedback, reply to a rating; Disputes, add a statement; Rate your clients.
- [ ] More: Earnings shows the whole company, with each agent.

## 3. Supervisor (Salma, then Rehab)

- [ ] Team shows only their own agents; they cannot edit another supervisor.
- [ ] Review queue: open a report, approve it or return it with a comment.
- [ ] Earnings: "Your team's earnings", only their agents.

## 4. Field agent (Mostafa): the most important block

- [ ] Home: tasks by overdue, today, upcoming.
- [ ] Open a case, then **Open field work**.
- [ ] **Check in**: the phone asks for location; allow it. The check-in shows "Phone GPS, accurate to ... m" and a map link that opens.
- [ ] Take the 3 labelled photos with the camera.
- [ ] Scan the ID card: fields fill in. Fill the rest of the report and **Save answers**.
- [ ] Close the app completely and open it again: photos and answers are still there.
- [ ] Submit the report.
- [ ] More: no Earnings entry; **My completed work** shows counts and statuses, no amounts.
- [ ] Case screen shows no price.

## 5. No signal (Mostafa or Omar)

- [ ] With signal, open Home once (cases are saved on the phone).
- [ ] Turn on **airplane mode** (or More, Demo, **Simulate no signal**).
- [ ] Home shows "No signal"; a saved case opens straight into field work, with Visit details.
- [ ] Check in, take a photo, save answers: each shows "Not sent yet".
- [ ] Turn airplane mode off: the waiting work is sent by itself; More, "Work saved on the phone" shows nothing waiting.

## 6. Collection (Tarek, then Adel)

- [ ] Tarek: open a collection case, log a call, log a **field visit** (location asked), record a promise to pay.
- [ ] Adel: the case shows the actions; record a payment; request a settlement.

## 7. Arabic

Switch language in More, then repeat a few steps from blocks 2 and 4:

- [ ] Everything reads right to left: tabs order, back arrows, lists, forms, numbers in Arabic digits.
- [ ] No English labels (names, streets and text people typed can stay as written).
- [ ] Long Arabic text fits on buttons and cards without being cut off.

## 8. Phone-specific

- [ ] Keyboard does not cover the field you are typing in (sign-up, report, settings).
- [ ] Pull down on a list refreshes it.
- [ ] Android back button goes back one screen.
- [ ] Refusing camera or location permission shows a clear message, and the app keeps working.

## Report

For each problem: which account, which screen, what you did, what you expected, and a screenshot. Send them in one message and they will be fixed before the requester side starts.
