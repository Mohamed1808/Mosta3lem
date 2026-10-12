# Internal console: test checklist

The web console for the Mosta3lem team, tried on a computer in English and Arabic. Each block takes 5 to 10 minutes. Tick what works, and note anything that looks wrong with a screenshot.

## Setup

In PowerShell:

```
cd "C:\Users\mmohe\OneDrive\Desktop\Silital Website Claude Code\ICM-Marketplace\console"
$env:Path = "C:\Program Files\nodejs;$env:Path"
npm install
npm run dev -- -p 3600
```

Open http://localhost:3600. Sign in with a work email below and the password **Mosta3lem@2026**, then the code shown on screen. Or click a name under **Demo staff accounts**.

| Who | Team | Email |
|---|---|---|
| Laila Hosny | Super admin | laila.hosny@platform.example |
| Karim Fawzy | Management | karim.fawzy@platform.example |
| Mai Adel | Operations | mai.adel@platform.example |
| Hossam Tawfik | Finance | hossam.tawfik@platform.example |
| Ziad Ezzat | Quality | ziad.ezzat@platform.example |
| Nermine Saad | Legal | nermine.saad@platform.example |
| Amira Galal | Customer support | amira.galal@platform.example |
| Sherif Lotfy | Sales | sherif.lotfy@platform.example |
| Yara Nabil | Data | yara.nabil@platform.example |

The console keeps its own demo data in this browser, separate from the phone. To start over, clear the site data for localhost:3600 in the browser settings.

## 1. Sign-in and access

- [ ] A wrong password is refused; the right one asks for the code.
- [ ] An organisation email (nadia.samir@horus-auto.example) is turned away: organisations use the app.
- [ ] **Teams and access** shows each team's permissions; your team is highlighted.
- [ ] Each person sees only their menu entries (compare Amira, Hossam and Laila).

## 2. Providers (Mai, then Karim)

- [ ] Register a provider in the app (or use an application waiting), then as Mai: **Approve (Operations)**.
- [ ] Mai cannot sign off. As Karim: **Sign off (Management)**; the provider goes live and the history shows both.
- [ ] As Karim: warn a provider, then put it back to automatic.
- [ ] As Sherif (Sales): the provider page has no buttons and no document images.

## 3. Cases and Quality (Mai, Amira, Ziad)

- [ ] Cases: tabs Open, Past deadline, At risk, Closed; search by name; filter by client.
- [ ] Mai: open a case, **Extend SLA** by 24 hours with a reason; the timeline shows it.
- [ ] Amira: the same case shows customer details, report and notes as hidden, and no buttons; she can **Open a dispute for the client**.
- [ ] Ziad: Quality review lists reports from individual providers (send one from the app as Omar Hassan to see it).

## 4. Disputes (Nermine, then Karim)

- [ ] Nermine: open a dispute, **Propose a decision**. Nothing changes yet.
- [ ] Nermine cannot confirm her own proposal.
- [ ] Karim: **Confirm decision** (or **Send back** with a note). The decision shows both names.

## 5. Finance (Hossam, then Karim)

- [ ] Totals, the fee card and invoices by Draft / Issued / Paid.
- [ ] Open an invoice: **Adjust** one case to 50% with a reason; **Record payment received** on an issued one.
- [ ] Hossam: **Propose a new fee**. Karim: **Confirm the new fee**. The history shows both.
- [ ] Hossam: **E-invoicing (ETA)** lists what is missing. Fill in a test profile (tax number 123456789, item codes EG-123456789-INV and EG-123456789-COL). On an issued invoice, the **E-invoice (ETA)** card shows VAT and what is still missing; Sherif adds the organisation's **Tax details**; the card turns **Ready** and the file downloads.

## 6. Accounts and settings (Sherif, Amira, Laila)

- [ ] Sherif: **New organisation** with its first Admin; then sign in to the app as that Admin.
- [ ] Amira: on an organisation, **Reset sign-in** for a user who was locked out.
- [ ] Sherif: an organisation page shows **Compliance**: Horus is supervised by the FRA, Delta Crest Bank is not. **Change FRA supervision** needs a reason. Mai: Recovery Partners' documents show its FRA register number.
- [ ] Laila: **Staff**: add a person, change their team, deactivate them.
- [ ] Laila: **Settings**: change a scoring threshold and save.

## 7. Reports and activity (Yara, Nermine)

- [ ] Yara: **Reports** shows totals by month, service, provider, client and governorate, with no money and no customer names.
- [ ] Nermine: **Activity log** lists who did what; search and filter by team.

- [ ] Nermine: **Data protection** shows a request waiting (DPR-...). Open it: the cases about the person and the organisation told. **Export their data** downloads a file.
- [ ] Nermine: **Log a request** to delete someone's data (copy a national ID from a closed case). On the request, **Delete their data**: the case now says its personal details were deleted.
- [ ] Amira (Support): **Report a breach** works, but there is no Data protection page. Nermine gets the breach, with 72 hours on the clock; mark it reported, then close it.
- [ ] Nermine: **Retention and agreements** shows the periods (photos 365 days, the rest 1,095) and which organisations accepted the data processing agreement.

## 8. Arabic and layout

- [ ] Switch to العربية: the whole console reads right to left, no English labels (names, emails and typed text stay as written).
- [ ] Make the window narrow: the menu opens from the **Menu** button and tables scroll sideways.

## Report

For each problem: which person, which page, what you did, what you expected, and a screenshot. Send them in one message.

## 9. With the real server (optional)

This runs the console on the real API instead of its own demo data.

1. In a second PowerShell window, start the API:
   ```
   cd "C:\Users\mmohe\OneDrive\Desktop\Silital Website Claude Code\ICM-Marketplace\backend"
   $env:Path = "C:\Program Files\nodejs;$env:Path"
   npm install
   npm start
   ```
2. In the `console` folder, copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_API_URL=http://localhost:4000`. Restart `npm run dev -- -p 3600`.

- [ ] Sign in as Laila with the demo password: a code is asked for. No email is really sent: the code is in the API window, in a line with "Your Mosta3lem code is".
- [ ] As Laila, **Staff**: add a person. In the API window, find "Choose your password here:" and open that link. A weak password is refused; a good one (10 characters, letters and numbers) is saved.
- [ ] Sign out, then sign in as that person with their new password and the code.
- [ ] **Forgot your password?** on the sign-in page: a link appears in the API window.
- [ ] Sign in as Laila (Super admin) or Hossam (Finance): after the emailed code, **Set up your authenticator app** shows a QR code. Scan it with Google or Microsoft Authenticator and type its code. Sign out and in again: no email this time, the app's code instead. A wrong code is refused.
- [ ] Try a wrong password a few times on any account. Then sign in as Nermine (Legal): **Security log** shows the failed attempts, the lockout after 5, the address and the device, and the last 24 hours at the top. Clicking an address shows only its failed attempts. Mai (Operations) has no Security log in her menu.
- [ ] Changes made here (a new staff member, an extended deadline) are still there after you stop and start the API.
