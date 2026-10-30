
import type { SQLiteDatabase } from "expo-sqlite";

export type TransportType = "flight" | "train" | "bus";
export type TripStatus = "planned" | "completed" | "cancelled";

export type NewTrip = {
  id: string;
  transportType: TransportType;
  title: string;
  origin: string;
  destination: string;
  departureDate: string;
  arrivalDate?: string | null;
  bookingReference?: string | null;
  ticketPriceMinor?: number;
  currency?: string;
  status?: TripStatus;
  notes?: string | null;
};

export type NewExpense = {
  id: string;
  tripId?: string | null;
  title: string;
  category: string;
  amountMinor: number;
  currency?: string;
  expenseDate: string;
  notes?: string | null;
};

export async function createTrip(
  db: SQLiteDatabase,
  trip: NewTrip
) {
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO trips (
      id, transport_type, title, origin, destination,
      departure_date, arrival_date, booking_reference,
      ticket_price_minor, currency, status, notes,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    trip.id,
    trip.transportType,
    trip.title.trim(),
    trip.origin.trim(),
    trip.destination.trim(),
    trip.departureDate,
    trip.arrivalDate ?? null,
    trip.bookingReference ?? null,
    trip.ticketPriceMinor ?? 0,
    trip.currency ?? "INR",
    trip.status ?? "completed",
    trip.notes ?? null,
    now,
    now
  );
}

export async function createExpense(
  db: SQLiteDatabase,
  expense: NewExpense
) {
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO expenses (
      id, trip_id, title, category, amount_minor,
      currency, expense_date, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    expense.id,
    expense.tripId ?? null,
    expense.title.trim(),
    expense.category,
    expense.amountMinor,
    expense.currency ?? "INR",
    expense.expenseDate,
    expense.notes ?? null,
    now,
    now
  );
}

export async function getRecentTrips(db: SQLiteDatabase) {
  return db.getAllAsync<{
    id: string;
    transport_type: TransportType;
    title: string;
    origin: string;
    destination: string;
    departure_date: string;
    status: TripStatus;
    ticket_price_minor: number;
    currency: string;
  }>(
    `SELECT
      id, transport_type, title, origin, destination,
      departure_date, status, ticket_price_minor, currency
     FROM trips
     ORDER BY departure_date DESC, created_at DESC
     LIMIT 10`
  );
}

export async function getTripCounts(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{
    flights: number;
    trains: number;
    buses: number;
  }>(`
    SELECT
      SUM(CASE WHEN transport_type = 'flight' THEN 1 ELSE 0 END) AS flights,
      SUM(CASE WHEN transport_type = 'train' THEN 1 ELSE 0 END) AS trains,
      SUM(CASE WHEN transport_type = 'bus' THEN 1 ELSE 0 END) AS buses
    FROM trips
    WHERE status = 'completed'
  `);

  return {
    flights: row?.flights ?? 0,
    trains: row?.trains ?? 0,
    buses: row?.buses ?? 0,
  };
}


export async function getTripById(db: SQLiteDatabase, id: string) {
  return db.getFirstAsync<{
    id: string;
    transport_type: TransportType;
    title: string;
    origin: string;
    destination: string;
    departure_date: string;
    arrival_date: string | null;
    booking_reference: string | null;
    ticket_price_minor: number;
    currency: string;
    status: TripStatus;
    notes: string | null;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT * FROM trips WHERE id = ?`,
    id
  );
}

export async function deleteTrip(db: SQLiteDatabase, id: string) {
  await db.runAsync("DELETE FROM trips WHERE id = ?", id);
}


export async function updateTrip(
  db: SQLiteDatabase,
  id: string,
  trip: NewTrip
) {
  const now = new Date().toISOString();

  await db.runAsync(
    `UPDATE trips SET
      transport_type = ?,
      title = ?,
      origin = ?,
      destination = ?,
      departure_date = ?,
      arrival_date = ?,
      booking_reference = ?,
      ticket_price_minor = ?,
      currency = ?,
      status = ?,
      notes = ?,
      updated_at = ?
    WHERE id = ?`,
    trip.transportType,
    trip.title.trim(),
    trip.origin.trim(),
    trip.destination.trim(),
    trip.departureDate,
    trip.arrivalDate ?? null,
    trip.bookingReference ?? null,
    trip.ticketPriceMinor ?? 0,
    trip.currency ?? "INR",
    trip.status ?? "completed",
    trip.notes ?? null,
    now,
    id
  );
}
