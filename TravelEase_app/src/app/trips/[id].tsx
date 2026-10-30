import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { deleteTrip, getTripById } from "../../database/repository";
import { theme } from "../../theme";

type Trip = NonNullable<Awaited<ReturnType<typeof getTripById>>>;

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || "—"}</Text>
    </View>
  );
}

export default function TripDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTrip = useCallback(async () => {
    if (!id) return;

    try {
      const result = await getTripById(db, id);
      setTrip(result);
    } catch (error) {
      console.error("Unable to load trip:", error);
      Alert.alert("Error", "Unable to load this trip.");
    } finally {
      setLoading(false);
    }
  }, [db, id]);

  useFocusEffect(
    useCallback(() => {
      void loadTrip();
    }, [loadTrip]),
  );

  function confirmDelete() {
    if (!trip) return;

    Alert.alert(
      "Delete this trip?",
      "This trip will be permanently removed. Any linked expenses will remain saved but become unlinked.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteTrip(db, trip.id);
              router.back();
            } catch (error) {
              console.error("Delete failed:", error);
              Alert.alert("Error", "Could not delete this trip.");
            }
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.textPrimary} />
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Trip not found</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />

      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Back to trips</Text>
        </Pressable>

        <Text style={styles.eyebrow}>
          {trip.transport_type.toUpperCase()} JOURNEY
        </Text>
        <Text style={styles.title}>{trip.title}</Text>

        <View style={styles.routeCard}>
          <Text style={styles.routeCity}>{trip.origin}</Text>
          <Text style={styles.routeArrow}>↓</Text>
          <Text style={styles.routeCity}>{trip.destination}</Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.sectionTitle}>Trip information</Text>
          <Text style={styles.status}>{trip.status.toUpperCase()}</Text>
        </View>

        <View style={styles.card}>
          <DetailRow label="Transport" value={trip.transport_type} />
          <DetailRow label="Departure" value={trip.departure_date} />
          <DetailRow label="Arrival" value={trip.arrival_date ?? ""} />
          <DetailRow
            label="Booking reference"
            value={trip.booking_reference ?? ""}
          />
          <DetailRow
            label="Ticket price"
            value={`${trip.currency} ${(trip.ticket_price_minor / 100).toFixed(2)}`}
          />
          <DetailRow label="Notes" value={trip.notes ?? ""} />
        </View>

        <Pressable
          onPress={() => router.push(`/trips/add?id=${trip.id}`)}
          style={styles.editButton}
        >
          <Text style={styles.editButtonText}>✎ Edit Trip</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={confirmDelete}
          style={styles.deleteButton}
        >
          <Text style={styles.deleteText}>Delete trip</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: 48,
  },
  center: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.md,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: theme.spacing.xl,
  },
  backText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  eyebrow: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 29,
    fontWeight: "800",
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  routeCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  routeCity: {
    color: theme.colors.textPrimary,
    fontSize: 23,
    fontWeight: "800",
  },
  routeArrow: {
    color: theme.colors.textSecondary,
    fontSize: 22,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
    fontSize: 17,
    fontWeight: "700",
  },
  status: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  detailRow: {
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 5,
  },
  detailLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  detailValue: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  deleteButton: {
    marginTop: theme.spacing.xl,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.danger,
    borderRadius: theme.radius.md,
  },
  deleteText: {
    color: theme.colors.danger,
    fontSize: 14,
    fontWeight: "700",
  },
  editButton: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    marginTop: theme.spacing.lg,
  },
  editButtonText: {
    color: theme.colors.onPrimary,
    fontSize: 15,
    fontWeight: "800",
  },
});
