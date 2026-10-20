# Backend (Google Apps Script)

Runs free in the client's Google account. It provides:

- technician login (sheet `Tecnicos`)
- consecutive report numbers without duplicates between tablets (`LockService`)
- PDF archive in a Drive folder
- email to the client, with the company in CC (`MailApp`)
- a log of every report (sheet `Reportes`)

## Install (about 10 minutes, signed in to the client's Google account)

1. Create a Google Sheet named **Tecnijet – Reportes**.
2. In the Sheet, open **Extensions → Apps Script**.
3. Paste in the two files:
   - Replace `Code.gs` with [`Code.gs`](Code.gs).
   - Optional: to replace `appsscript.json`, turn on ⚙ Project settings → "Show appsscript.json manifest file", then paste [`appsscript.json`](appsscript.json). It only sets the time zone (America/Bogota) and web-app defaults, which are chosen in the deploy dialog anyway.
4. Select the `setup` function and click **Run**, then accept the permissions. This creates:
   - the `Tecnicos` and `Reportes` sheets
   - the Drive folder *Tecnijet - Reportes PDF*
   - the script properties

   The log shows the generated **API_KEY**.
5. In **Project settings → Script properties**, adjust these if needed:
   - `COMPANY_EMAIL`: receives a copy of every report. It defaults to the account's own email.
   - `NEXT_NUMBER`: the first number to use. It defaults to `10451`, the client's starting number. Change it only before go-live.
   - `PREFIX` (`TJ-`) and `PAD` (`5`): these give numbers like `TJ-10451`.
6. Add the technicians to the `Tecnicos` sheet, one row each: `Usuario | Nombre | PIN | Activo` (for example `Tecnico1 | Diego Castañeda | 1234 | SI`). Usernames ignore accents and capitals.
7. Deploy with **Deploy → New deployment → Web app**:
   - Execute as **Me**.
   - Set access to **Anyone**.
   - Copy the `/exec` URL.
8. In `app/.env`, set:
   ```
   EXPO_PUBLIC_API_URL=<the /exec URL>
   EXPO_PUBLIC_API_KEY=<API_KEY from step 4>
   ```
   Then rebuild the APK.

After editing the code, use **Deploy → Manage deployments → Edit → New version**. This keeps the same URL.

## Limits

MailApp sends to about **100 recipients/day** on a free Gmail account, or 1,500 on Google Workspace. Tecnijet's `info@tecnijet.com.co` is on Google Workspace (checked from its public mail records), so the limit is about 750 visits per day.

## Test

`node backend/test.js` checks login, numbering and sending against in-memory stand-ins for the Google services.
