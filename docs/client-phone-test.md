# Client app: phone test checklist

The organisation side of the app (companies that request investigations or collections), tried on a real phone in Arabic and English. Each block takes 5 to 10 minutes. Tick what works, and note anything that looks wrong with a screenshot.

## Setup

Same as the provider test ([provider-phone-test.md](provider-phone-test.md)): Expo Go on the phone, then in PowerShell in the `app` folder:

```
$env:Path = "C:\Program Files\nodejs;$env:Path"
npx expo start --tunnel
```

Scan the QR code. On the sign-in screen choose **Organisation** and use a work email below with the password **Mosta3lem@2026**, then the code shown on screen. Or use **Demo accounts**, section "Organisations requesting work".

| Who | Role | Email |
|---|---|---|
| Nadia Samir | Admin, Horus Auto Finance | nadia.samir@horus-auto.example |
| Heba Mansour | Operations, Horus | heba.mansour@horus-auto.example |
| Tamer Lotfy | Investigations, Horus | tamer.lotfy@horus-auto.example |
| Youssef Kamel | Collections, Horus | youssef.kamel@horus-auto.example |

To start over at any point: More, then **Reset demo data**.

## 1. Sign-in (Nadia)

- [ ] **Organisation** tab: a wrong password is refused with "Wrong email or password".
- [ ] Five wrong tries lock the account for 15 minutes (try with Youssef, then use Reset demo data).
- [ ] The right password asks for the code; the code signs you in to the organisation home.

## 2. Home and cases (Nadia)

- [ ] Home: open cases, reports waiting for your decision, the six-month chart. Spending is shown.
- [ ] Cases tab: the badge counts what needs you; groups Needs you, Waiting for provider, In progress, Drafts, Done, Cancelled; search works.
- [ ] Open a delivered report: photos, GPS check-in, answers. The provider company is shown, **no field agent names** anywhere (case, timeline).
- [ ] Set your decision on the customer, then **Accept report**; or **Request rework** with a reason.
- [ ] Collection case waiting for you: approve or reject the settlement.

## 3. New request (Tamer)

- [ ] New tab goes straight to the investigation form (Tamer covers investigations only).
- [ ] Governorate, then city from the list; try **Other** and type a village.
- [ ] Changing inquiry types moves the deadline.
- [ ] **Save draft**, open it from Cases → Drafts, edit it.
- [ ] **Choose provider**: only providers covering that city; sort by price; **Send to best match**.

## 4. Bulk upload and batches (Tamer)

- [ ] New tab → Many cases at once → **Excel template** opens the share sheet; save it or send it to yourself.
- [ ] Fill a few rows in Excel on the phone (or a computer), then **Choose Excel or CSV file**. Or **Try with the demo file**.
- [ ] Rows with errors show what is wrong; tap one to fix it or leave it out.
- [ ] Create the batch; on the batch screen choose **By governorate**, **Pick the best match**, **Send offers**.

## 5. Ratings and disputes (Nadia)

- [ ] More → Ratings → **Rate now**: stars, criteria, tags, comment; it moves to Given.
- [ ] Raise a dispute on a case in progress; it shows Disputed and a link to the dispute.
- [ ] In the dispute, add a statement; the demo button decides it.
- [ ] A finished batch: **Close batch and rate**.

## 6. Money and reports

- [ ] Nadia: More → Invoices; open an issued invoice, **Mark as paid**.
- [ ] Nadia: More → Reports; **Export investigations to Excel** opens the share sheet; the file opens in Excel with the Residence and Business sheets.
- [ ] Tamer and Heba: no Invoices entry, no spending on Home or in Reports.

## 7. Users (Nadia)

- [ ] More → Users: invite someone as Collections; sign out and sign in as them (their email, same password).
- [ ] Change a role; deactivate a user and check they can no longer sign in.
- [ ] Nadia cannot demote or deactivate herself.

## 8. Arabic and phone basics

- [ ] Switch language in More, repeat a few steps: everything right to left, Arabic digits, no English labels (names, emails and text people typed stay as written).
- [ ] Keyboard does not cover the field you are typing in (request form, bulk row fix, invite).
- [ ] Android back button goes back one screen; pull down refreshes lists.

## Report

For each problem: which account, which screen, what you did, what you expected, and a screenshot. Send them in one message.
