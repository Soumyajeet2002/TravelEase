
import type { SQLiteDatabase } from "expo-sqlite";

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  const result = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version"
  );

  const currentVersion = result?.user_version ?? 0;

  if (currentVersion < 1) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS trips (
          id TEXT PRIMARY KEY NOT NULL,
          transport_type TEXT NOT NULL
            CHECK (transport_type IN ('flight', 'train', 'bus')),
          title TEXT NOT NULL,
          origin TEXT NOT NULL,
          destination TEXT NOT NULL,
          departure_date TEXT NOT NULL,
          arrival_date TEXT,
          booking_reference TEXT,
          ticket_price_minor INTEGER NOT NULL DEFAULT 0
            CHECK (ticket_price_minor >= 0),
          currency TEXT NOT NULL DEFAULT 'INR',
          status TEXT NOT NULL DEFAULT 'completed'
            CHECK (status IN ('planned', 'completed', 'cancelled')),
          notes TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_trips_departure_date
          ON trips(departure_date);

        CREATE INDEX IF NOT EXISTS idx_trips_status
          ON trips(status);

        CREATE TABLE IF NOT EXISTS expenses (
          id TEXT PRIMARY KEY NOT NULL,
          trip_id TEXT,
          title TEXT NOT NULL,
          category TEXT NOT NULL,
          amount_minor INTEGER NOT NULL CHECK (amount_minor >= 0),
          currency TEXT NOT NULL DEFAULT 'INR',
          expense_date TEXT NOT NULL,
          notes TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (trip_id) REFERENCES trips(id)
            ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_expenses_date
          ON expenses(expense_date);

        CREATE INDEX IF NOT EXISTS idx_expenses_trip
          ON expenses(trip_id);

        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );

        PRAGMA user_version = 1;
      `);
    });
  }
}
