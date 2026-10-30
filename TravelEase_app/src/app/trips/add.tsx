import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  createTrip,
  getTripById,
  updateTrip,
  type TransportType,
  type TripStatus,
} from "../../database/repository";
import { theme } from "../../theme";

const transportOptions: {
  value: TransportType;
  label: string;
  symbol: string;
  hint: string;
}[] = [
  { value: "flight", label: "Flight", symbol: "✈", hint: "Air travel" },
  { value: "train", label: "Train", symbol: "▤", hint: "Rail journey" },
  { value: "bus", label: "Bus", symbol: "▰", hint: "Road journey" },
];

const statusOptions: { value: TripStatus; label: string }[] = [
  { value: "completed", label: "Completed" },
  { value: "planned", label: "Planned" },
  { value: "cancelled", label: "Cancelled" },
];

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  required?: boolean;
  keyboardType?: "default" | "numeric" | "decimal-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
};

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  required = false,
  keyboardType = "default",
  autoCapitalize = "sentences",
}: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? " *" : ""}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={styles.input}
        selectionColor={theme.colors.textPrimary}
      />
    </View>
  );
}

export default function AddTripScreen() {
  const db = useSQLiteContext();
  const router = useRouter();

  const params = useLocalSearchParams<{ id?: string }>();
  const tripId = typeof params.id === "string" ? params.id : undefined;
  const isEditing = Boolean(tripId);

  const [loading, setLoading] = useState(isEditing);
  const [transport, setTransport] = useState<TransportType>("flight");
  const [title, setTitle] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [departureDate, setDepartureDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [arrivalDate, setArrivalDate] = useState("");
  const [bookingReference, setBookingReference] = useState("");
  const [ticketPrice, setTicketPrice] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [status, setStatus] = useState<TripStatus>("completed");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const loadTrip = useCallback(async () => {
    if (!tripId) return;

    try {
      setLoading(true);

      const trip = await getTripById(db, tripId);

      if (!trip) {
        Alert.alert("Trip not found", "This trip may have been deleted.", [
          { text: "OK", onPress: () => router.back() },
        ]);
        return;
      }

      setTransport(trip.transport_type);
      setTitle(trip.title);
      setOrigin(trip.origin);
      setDestination(trip.destination);
      setDepartureDate(trip.departure_date);
      setArrivalDate(trip.arrival_date ?? "");
      setBookingReference(trip.booking_reference ?? "");
      setTicketPrice((trip.ticket_price_minor / 100).toFixed(2));
      setCurrency(trip.currency);
      setStatus(trip.status);
      setNotes(trip.notes ?? "");
    } catch (error) {
      console.error("Failed to load trip:", error);
      Alert.alert("Error", "Could not load trip details.");
    } finally {
      setLoading(false);
    }
  }, [db, tripId, router]);

  useEffect(() => {
    loadTrip();
  }, [loadTrip]);

  async function handleSave() {
    if (saving) return;

    const cleanOrigin = origin.trim();
    const cleanDestination = destination.trim();
    const cleanTitle = title.trim();

    if (!cleanOrigin || !cleanDestination || !departureDate.trim()) {
      Alert.alert(
        "Missing details",
        "Please enter the origin, destination and departure date.",
      );
      return;
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(departureDate) ||
      Number.isNaN(Date.parse(`${departureDate}T00:00:00`))
    ) {
      Alert.alert("Invalid date", "Use the date format YYYY-MM-DD.");
      return;
    }

    if (arrivalDate.trim()) {
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(arrivalDate) ||
        Number.isNaN(Date.parse(`${arrivalDate}T00:00:00`)) ||
        arrivalDate < departureDate
      ) {
        Alert.alert(
          "Invalid arrival date",
          "Enter a valid arrival date on or after departure.",
        );
        return;
      }
    }

    const normalizedCurrency = currency.trim().toUpperCase();

    if (!/^[A-Z]{3}$/.test(normalizedCurrency)) {
      Alert.alert(
        "Invalid currency",
        "Enter a three-letter currency code, such as INR.",
      );
      return;
    }

    const parsedPrice = ticketPrice.trim() ? Number(ticketPrice.trim()) : 0;

    if (
      !Number.isFinite(parsedPrice) ||
      parsedPrice < 0 ||
      !Number.isSafeInteger(Math.round(parsedPrice * 100))
    ) {
      Alert.alert(
        "Invalid ticket price",
        "Enter a valid non-negative amount, such as 1250.50.",
      );
      return;
    }

    setSaving(true);

    try {
      const tripData = {
        transportType: transport,
        title: cleanTitle || `${cleanOrigin} → ${cleanDestination}`,
        origin: cleanOrigin,
        destination: cleanDestination,
        departureDate,
        arrivalDate: arrivalDate.trim() || null,
        bookingReference: bookingReference.trim() || null,
        ticketPriceMinor: Math.round(parsedPrice * 100),
        currency: normalizedCurrency,
        status,
        notes: notes.trim() || null,
      };

      if (isEditing && tripId) {
        await updateTrip(db, tripId, tripData);

        Alert.alert("Trip updated", "Your changes have been saved.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        const id = `trip_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 8)}`;

        await createTrip(db, {
          id,
          ...tripData,
        });

        Alert.alert("Trip saved", "Your trip has been saved on this device.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    } catch (error) {
      console.error("Failed to save trip:", error);
      Alert.alert(
        "Could not save trip",
        "Please try again. If the issue continues, check the database setup.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <StatusBar style="light" />
        <Text style={styles.subtitle}>Loading trip details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" backgroundColor={theme.colors.background} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backText}>‹ Back</Text>
          </Pressable>

          <Text style={styles.eyebrow}>YOUR NEXT ADVENTURE</Text>
          <Text style={styles.heading}>
            {isEditing ? "Edit trip" : "Add a trip"}
          </Text>
          <Text style={styles.subtitle}>
            {isEditing
              ? "Update your journey details."
              : "Save your journey details and ticket cost."}
          </Text>

          <Text style={styles.sectionTitle}>Transport type</Text>
          <View style={styles.transportRow}>
            {transportOptions.map((option) => {
              const selected = transport === option.value;

              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setTransport(option.value)}
                  style={[
                    styles.transportCard,
                    selected && styles.transportCardSelected,
                  ]}
                >
                  <Text style={styles.transportSymbol}>{option.symbol}</Text>
                  <Text
                    style={[
                      styles.transportLabel,
                      selected && styles.selectedText,
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text style={styles.transportHint}>{option.hint}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Journey details</Text>

          <Field
            label="Trip title"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Weekend in Delhi (optional)"
          />
          <Field
            label="From"
            value={origin}
            onChangeText={setOrigin}
            placeholder="Departure city or station"
            required
          />
          <Field
            label="To"
            value={destination}
            onChangeText={setDestination}
            placeholder="Destination city or station"
            required
          />

          <View style={styles.twoColumns}>
            <View style={styles.half}>
              <Field
                label="Departure date"
                value={departureDate}
                onChangeText={setDepartureDate}
                placeholder="YYYY-MM-DD"
                required
              />
            </View>
            <View style={styles.half}>
              <Field
                label="Arrival date"
                value={arrivalDate}
                onChangeText={setArrivalDate}
                placeholder="YYYY-MM-DD"
              />
            </View>
          </View>

          <Text style={styles.helper}>
            Enter dates as YYYY-MM-DD, for example 2026-10-29.
          </Text>

          <Text style={styles.sectionTitle}>Booking & cost</Text>
          <Field
            label="Booking reference"
            value={bookingReference}
            onChangeText={setBookingReference}
            placeholder="PNR or booking code (optional)"
            autoCapitalize="characters"
          />

          <View style={styles.twoColumns}>
            <View style={styles.half}>
              <Field
                label="Ticket price"
                value={ticketPrice}
                onChangeText={setTicketPrice}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.half}>
              <Field
                label="Currency code"
                value={currency}
                onChangeText={setCurrency}
                placeholder="INR"
                autoCapitalize="characters"
              />
            </View>
          </View>

          <Text style={styles.helper}>
            The ticket price is stored on the trip and won't be entered again as
            a separate expense.
          </Text>

          <Text style={styles.sectionTitle}>Trip status</Text>
          <View style={styles.statusRow}>
            {statusOptions.map((option) => {
              const selected = status === option.value;

              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setStatus(option.value)}
                  style={[
                    styles.statusChip,
                    selected && styles.statusChipSelected,
                  ]}
                >
                  <Text
                    style={[styles.statusText, selected && styles.selectedText]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Field
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Any details to remember (optional)"
          />

          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={handleSave}
            style={({ pressed }) => [
              styles.saveButton,
              pressed && !saving && styles.pressed,
              saving && styles.disabledButton,
            ]}
          >
            <Text style={styles.saveButtonText}>
              {saving
                ? isEditing
                  ? "Updating trip…"
                  : "Saving trip…"
                : isEditing
                  ? "Save changes  →"
                  : "Save trip  →"}
            </Text>
          </Pressable>

          <Text style={styles.footer}>STORED LOCALLY ON YOUR DEVICE</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: theme.colors.background },
  center: { alignItems: "center", justifyContent: "center" },
  content: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: 48,
  },
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: theme.spacing.sm,
    paddingRight: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  backText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    fontWeight: "600",
  },
  eyebrow: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: theme.spacing.sm,
  },
  heading: {
    color: theme.colors.textPrimary,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  transportRow: { flexDirection: "row", gap: theme.spacing.sm },
  transportCard: {
    flex: 1,
    minWidth: 0,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: 4,
    alignItems: "center",
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  transportCardSelected: {
    borderColor: theme.colors.textPrimary,
    backgroundColor: theme.colors.surfaceElevated,
  },
  transportSymbol: {
    color: theme.colors.textPrimary,
    fontSize: 23,
    marginBottom: 7,
  },
  transportLabel: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },
  transportHint: {
    color: theme.colors.textMuted,
    fontSize: 10,
    marginTop: 4,
  },
  selectedText: { color: theme.colors.textPrimary },
  field: { marginBottom: theme.spacing.md },
  label: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: theme.spacing.sm,
  },
  input: {
    minHeight: 48,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    fontSize: 14,
  },
  twoColumns: { flexDirection: "row", gap: theme.spacing.md },
  half: { flex: 1, minWidth: 0 },
  helper: {
    color: theme.colors.textMuted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: -4,
    marginBottom: theme.spacing.md,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  statusChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  statusChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  statusText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  saveButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    marginTop: theme.spacing.md,
  },
  saveButtonText: {
    color: theme.colors.onPrimary,
    fontSize: 15,
    fontWeight: "800",
  },
  pressed: { opacity: 0.75 },
  disabledButton: { opacity: 0.55 },
  footer: {
    color: theme.colors.textMuted,
    fontSize: 9,
    letterSpacing: 1.2,
    textAlign: "center",
    marginTop: theme.spacing.xl,
  },
});
