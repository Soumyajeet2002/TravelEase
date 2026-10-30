import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { getRecentTrips } from "../database/repository";
import { theme } from "../theme";

type Trip = Awaited<ReturnType<typeof getRecentTrips>>[number];

function formatMoney(minor: number, currency: string) {
  return `${currency} ${(minor / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function TripsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTrips = useCallback(async () => {
    try {
      setTrips(await getRecentTrips(db));
    } catch (error) {
      console.error("Could not load trips:", error);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void loadTrips();
    }, [loadTrips]),
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>YOUR JOURNEY LOG</Text>
        <Text style={styles.heading}>My trips</Text>
        <Text style={styles.subtitle}>
          Your journeys, stored locally on this device.
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/trips/add")}
          style={styles.addButton}
        >
          <Text style={styles.addButtonText}>＋ Add a trip</Text>
        </Pressable>

        {loading ? (
          <Text style={styles.muted}>Loading your trips…</Text>
        ) : trips.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptySymbol}>✈</Text>
            <Text style={styles.emptyTitle}>No trips yet</Text>
            <Text style={styles.muted}>
              Your saved journeys will appear here.
            </Text>
          </View>
        ) : (
          trips.map((trip) => (
            <Pressable
              key={trip.id}
              style={styles.tripCard}
              onPress={() => router.push(`/trips/${trip.id}`)}
            >
              <View style={styles.tripTop}>
                <Text style={styles.transport}>
                  {trip.transport_type.toUpperCase()}
                </Text>
                <Text style={styles.status}>{trip.status}</Text>
              </View>

              <Text style={styles.route}>
                {trip.origin} → {trip.destination}
              </Text>
              <Text style={styles.tripTitle}>{trip.title}</Text>
              <View style={styles.tripBottom}>
                <Text style={styles.muted}>{trip.departure_date}</Text>
                <Text style={styles.price}>
                  {formatMoney(trip.ticket_price_minor, trip.currency)}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xxl,
    paddingBottom: 40,
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
    fontWeight: "800",
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  addButton: {
    minHeight: 48,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.xl,
  },
  addButtonText: {
    color: theme.colors.onPrimary,
    fontWeight: "800",
    fontSize: 14,
  },
  empty: {
    alignItems: "center",
    padding: theme.spacing.xxl,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: theme.spacing.md,
  },
  emptySymbol: {
    color: theme.colors.textPrimary,
    fontSize: 32,
    marginBottom: theme.spacing.md,
  },
  emptyTitle: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: theme.spacing.sm,
  },
  muted: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  tripCard: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  tripTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: theme.spacing.md,
  },
  transport: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  status: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    textTransform: "capitalize",
  },
  route: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 26,
  },
  tripTitle: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: theme.spacing.sm,
  },
  tripBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  price: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
});
