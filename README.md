# Expense Tracker (Android)

Offline Android port of the `expense-tracker` web app. All data is stored on the phone in SQLite. There is no server and no login.

**Stack:** Expo SDK 57 · expo-router (native tabs) · expo-sqlite + Drizzle ORM · dayjs

## Develop

```bash
npm install
npx expo start         # scan with Expo Go, or press "a" for an Android emulator
npm run typecheck
npm run lint
```

## Database

- The schema is in `src/db/schema.ts`. Money is stored as integer **satang**, and dates as local `YYYY-MM-DD` strings.
- After changing the schema, run `npm run db:generate`. Migrations run automatically when the app starts.

## Move data from Supabase (one-off)

1. Create `.env.local` (it is gitignored) containing `SUPABASE_URL=...` and `SUPABASE_KEY=...`. If RLS blocks the anon key, use the service_role key.
2. Run `npm run dump-supabase`. This writes `backup-supabase.json` and prints yearly totals.
3. Copy the file to the phone, then open **Settings › Import / restore backup**.
4. In **Summary › All years**, compare the yearly totals with the ones the script printed.

## Backup

Use **Settings › Export backup (JSON)** and share the file to Google Drive or LINE. To restore it, use **Import**. The import replaces all data on the phone.

## Build an APK

```bash
npx eas-cli@latest build -p android --profile preview
```
This needs an `eas.json` with a `preview` profile that sets `"android": { "buildType": "apk" }`.
