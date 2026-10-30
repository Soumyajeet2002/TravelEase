import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getRecentTrips, getTripCounts } from "../../src/database/repository";
import { theme } from "../../src/theme";

type Period = "Month" | "Year" | "All time";

type Trip = Awaited<ReturnType<typeof getRecentTrips>>[number];

type Counts = Awaited<ReturnType<typeof getTripCounts>>;

type SpendingRow = {
  currency: string;
  total_minor: number;
};

type CityRow = {
  city_count: number;
};

type QuickActionProps = {
  symbol: string;
  title: string;
  subtitle: string;
  onPress: () => void;
};

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function QuickAction({ symbol, title, subtitle, onPress }: QuickActionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}
    >
      <View style={styles.actionIcon}>
        <Text style={styles.actionSymbol}>{symbol}</Text>
      </View>

      <View style={styles.actionCopy}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.mutedText}>{subtitle}</Text>
      </View>

      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

function StatCard({
  symbol,
  label,
  value,
}: {
  symbol: string;
  label: string;
  value: number;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statSymbol}>{symbol}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function formatMoney(minor: number, currency: string) {
  const amount = minor / 100;

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function getDateRange(period: Period) {
  const now = new Date();

  if (period === "All time") {
    return null;
  }

  const start = new Date(now.getFullYear(), now.getMonth(), 1);

  if (period === "Year") {
    start.setMonth(0, 1);
  }

  return {
    start: [
      start.getFullYear(),
      String(start.getMonth() + 1).padStart(2, "0"),
      String(start.getDate()).padStart(2, "0"),
    ].join("-"),
    end: [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-"),
  };
}

export default function DashboardScreen() {
  const router = useRouter();
  const db = useSQLiteContext();

  const [period, setPeriod] = useState<Period>("Month");
  const [counts, setCounts] = useState<Counts>({
    flights: 0,
    trains: 0,
    buses: 0,
  });
  const [completedTrips, setCompletedTrips] = useState(0);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [cities, setCities] = useState(0);
  const [spending, setSpending] = useState<SpendingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setLoadError(false);

    try {
      const range = getDateRange(period);

      const [
        tripCounts,
        recentTrips,
        completedResult,
        cityResult,
        spendingRows,
      ] = await Promise.all([
        getTripCounts(db),

        getRecentTrips(db),

        db.getFirstAsync<{ total: number }>(
          `SELECT COUNT(*) AS total
     FROM trips
     WHERE status = 'completed'`,
        ),

        db.getFirstAsync<CityRow>(
          `SELECT COUNT(*) AS city_count
     FROM (
       SELECT LOWER(TRIM(origin)) AS city
       FROM trips
       WHERE status = 'completed'
         AND TRIM(origin) != ''

       UNION

       SELECT LOWER(TRIM(destination)) AS city
       FROM trips
       WHERE status = 'completed'
         AND TRIM(destination) != ''
     )`,
        ),

        range
          ? db.getAllAsync<SpendingRow>(
              `SELECT currency, SUM(total_minor) AS total_minor
         FROM (
           SELECT currency, ticket_price_minor AS total_minor
           FROM trips
           WHERE status = 'completed'
             AND departure_date BETWEEN ? AND ?

           UNION ALL

           SELECT currency, amount_minor AS total_minor
           FROM expenses
           WHERE expense_date BETWEEN ? AND ?
         )
         GROUP BY currency
         ORDER BY currency`,
              range.start,
              range.end,
              range.start,
              range.end,
            )
          : db.getAllAsync<SpendingRow>(
              `SELECT currency, SUM(total_minor) AS total_minor
         FROM (
           SELECT currency, ticket_price_minor AS total_minor
           FROM trips
           WHERE status = 'completed'

           UNION ALL

           SELECT currency, amount_minor AS total_minor
           FROM expenses
         )
         GROUP BY currency
         ORDER BY currency`,
            ),
      ]);

      setCounts(tripCounts);
      setTrips(recentTrips);
      setCompletedTrips(completedResult?.total ?? 0);
      setCities(cityResult?.city_count ?? 0);
      setSpending(spendingRows);
    } catch (error) {
      console.error("Failed to load dashboard:", error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [db, period]);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard]),
  );

  const spendingLabel = useMemo(() => {
    if (spending.length === 0) return "₹0.00";

    if (spending.length === 1) {
      return formatMoney(spending[0].total_minor ?? 0, spending[0].currency);
    }

    return `${spending.length} currencies`;
  }, [spending]);

  const showComingSoon = (feature: string) => {
    Alert.alert(feature, "This feature will be connected in a future build.");
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" backgroundColor={theme.colors.background} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.brandMark}>
            <Text style={styles.brandPlane}>✈</Text>
          </View>

          <View style={styles.brandCopy}>
            <Text style={styles.brandName}>TravelEase</Text>
            <Text style={styles.tagline}>TRACK · EXPLORE · REMEMBER</Text>
          </View>

          <Pressable
            accessibilityLabel="Profile"
            accessibilityRole="button"
            onPress={() => showComingSoon("Profile")}
            style={styles.profileButton}
          >
            <Text style={styles.profileInitial}>T</Text>
          </Pressable>
        </View>

        <View style={styles.greeting}>
          <Text style={styles.eyebrow}>YOUR TRAVEL SPACE</Text>
          <Text style={styles.pageTitle}>
            Every journey,{"\n"}in one place.
          </Text>
          <Text style={styles.intro}>
            Keep your trips and travel spending together.
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <SectionTitle title="Your travel overview" />
          {loading && <ActivityIndicator color={theme.colors.textSecondary} />}
        </View>

        <View style={styles.statsRow}>
          <StatCard symbol="✈" label="Flights" value={counts.flights} />
          <StatCard symbol="▤" label="Trains" value={counts.trains} />
          <StatCard symbol="▰" label="Buses" value={counts.buses} />
        </View>

        <View style={styles.citySummary}>
          <View style={styles.summaryItem}>
            <Text style={styles.mutedText}>COMPLETED TRIPS</Text>
            <Text style={styles.cityNumber}>{completedTrips}</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <Text style={styles.mutedText}>CITIES EXPLORED</Text>
            <Text style={styles.cityNumber}>{cities}</Text>
          </View>

          <View style={styles.globeCircle}>
            <Text style={styles.globeSymbol}>◎</Text>
          </View>
        </View>

        {/* <Pressable onPress={() => router.push("/database-debug")}>
          <Text style={{ color: "#FFFFFF" }}>Inspect local database</Text>
        </Pressable> */}
        <View style={styles.sectionHeader}>
          <SectionTitle title="Travel spending" />
          <Text style={styles.currencyLabel}>
            {spending.length === 1 ? spending[0].currency : "BY CURRENCY"}
          </Text>
        </View>

        <View style={styles.spendingCard}>
          <Text style={styles.mutedText}>TOTAL RECORDED</Text>
          <Text style={styles.totalAmount}>
            {loading ? "Loading…" : spendingLabel}
          </Text>

          <View style={styles.periodRow}>
            {(["Month", "Year", "All time"] as const).map((item) => {
              const selected = period === item;

              return (
                <Pressable
                  key={item}
                  onPress={() => setPeriod(item)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[
                    styles.periodButton,
                    selected && styles.periodButtonSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.periodText,
                      selected && styles.periodTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.spendingDivider} />

          <View style={styles.spendingFooter}>
            <View style={styles.spendingDot} />
            <Text style={styles.mutedText}>
              {spending.length === 0
                ? `${period} · No spending recorded yet`
                : `${period} · Recorded trip and expense totals`}
            </Text>
          </View>

          {spending.length > 1 && (
            <View style={styles.currencyBreakdown}>
              {spending.map((item) => (
                <View key={item.currency} style={styles.currencyRow}>
                  <Text style={styles.mutedText}>{item.currency}</Text>
                  <Text style={styles.breakdownAmount}>
                    {formatMoney(item.total_minor ?? 0, item.currency)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <SectionTitle title="Recent trips" />
          <Pressable
            onPress={() => router.navigate("/(tabs)/explore")}
            accessibilityRole="button"
          >
            <Text style={styles.linkText}>View all →</Text>
          </Pressable>
        </View>

        {loadError ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Couldn't load your trips</Text>
            <Text style={styles.emptyDescription}>
              Check the database setup and try again.
            </Text>
            <Pressable
              onPress={() => void loadDashboard()}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Try again</Text>
            </Pressable>
          </View>
        ) : loading ? (
          <View style={styles.emptyCard}>
            <ActivityIndicator color={theme.colors.textPrimary} />
            <Text style={styles.emptyDescription}>Loading recent trips…</Text>
          </View>
        ) : trips.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyPlane}>✈</Text>
            </View>
            <Text style={styles.emptyTitle}>Your next story starts here.</Text>
            <Text style={styles.emptyDescription}>
              Add your first trip to start building your personal travel
              history.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/trips/add")}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                ＋ Add your first trip
              </Text>
            </Pressable>
          </View>
        ) : (
          trips.slice(0, 3).map((trip) => (
            <Pressable
              key={trip.id}
              accessibilityRole="button"
              onPress={() => router.push(`/trips/${trip.id}`)}
              style={({ pressed }) => [
                styles.recentTripCard,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.recentTripTop}>
                <Text style={styles.recentTripType}>
                  {trip.transport_type.toUpperCase()}
                </Text>
                <Text style={styles.recentTripStatus}>{trip.status}</Text>
              </View>

              <Text style={styles.recentTripRoute}>
                {trip.origin} → {trip.destination}
              </Text>

              <View style={styles.recentTripBottom}>
                <Text style={styles.mutedText}>{trip.departure_date}</Text>
                <Text style={styles.recentTripPrice}>
                  {formatMoney(trip.ticket_price_minor, trip.currency)}
                </Text>
              </View>
            </Pressable>
          ))
        )}

        <SectionTitle title="Quick actions" />

        <QuickAction
          symbol="+"
          title="Add a trip"
          subtitle="Flight, train or bus"
          onPress={() => router.push("/trips/add")}
        />

        <QuickAction
          symbol="₹"
          title="Add an expense"
          subtitle="Meals, stays and more"
          onPress={() => showComingSoon("Add an expense")}
        />

        <Text style={styles.footerText}>
          YOUR JOURNEYS. YOUR DATA. STORED ON YOUR DEVICE.
        </Text>
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
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.xxl,
  },
  brandMark: {
    width: 46,
    height: 46,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  brandPlane: {
    color: theme.colors.textPrimary,
    fontSize: 25,
  },
  brandCopy: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  brandName: {
    color: theme.colors.textPrimary,
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  tagline: {
    color: theme.colors.textMuted,
    fontSize: 9,
    letterSpacing: 1.4,
    marginTop: 3,
  },
  profileButton: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInitial: {
    color: theme.colors.textPrimary,
    fontWeight: "700",
    fontSize: 16,
  },
  greeting: {
    marginBottom: theme.spacing.xl,
  },
  eyebrow: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: theme.spacing.sm,
  },
  pageTitle: {
    color: theme.colors.textPrimary,
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1.1,
    lineHeight: 40,
  },
  intro: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.body,
    lineHeight: 21,
    marginTop: theme.spacing.md,
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.subtitle,
    fontWeight: "700",
    marginBottom: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  statCard: {
    flex: 1,
    minHeight: 112,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statSymbol: {
    color: theme.colors.textSecondary,
    fontSize: 17,
    marginBottom: theme.spacing.sm,
  },
  statValue: {
    color: theme.colors.textPrimary,
    fontSize: 23,
    fontWeight: "800",
  },
  statLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  citySummary: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mutedText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  cityNumber: {
    color: theme.colors.textPrimary,
    fontSize: 19,
    fontWeight: "700",
    marginTop: 5,
  },
  globeCircle: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  globeSymbol: {
    color: theme.colors.textPrimary,
    fontSize: 25,
  },
  currencyLabel: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: theme.spacing.md,
  },
  spendingCard: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.xl,
  },
  totalAmount: {
    color: theme.colors.textPrimary,
    fontSize: 29,
    fontWeight: "800",
    marginTop: 5,
    marginBottom: theme.spacing.lg,
  },
  periodRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  periodButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  periodButtonSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  periodText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  periodTextSelected: {
    color: theme.colors.onPrimary,
  },
  spendingDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.lg,
  },
  spendingFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  spendingDot: {
    width: 8,
    height: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.textSecondary,
  },
  currencyBreakdown: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  currencyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
  },
  breakdownAmount: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
  linkText: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: theme.spacing.md,
  },
  emptyCard: {
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.xl,
  },
  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceElevated,
    marginBottom: theme.spacing.md,
  },
  emptyPlane: {
    color: theme.colors.textPrimary,
    fontSize: 25,
  },
  emptyTitle: {
    color: theme.colors.textPrimary,
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyDescription: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  primaryButton: {
    minHeight: 48,
    width: "100%",
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.md,
  },
  primaryButtonText: {
    color: theme.colors.onPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  recentTripCard: {
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  recentTripTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: theme.spacing.md,
  },
  recentTripType: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  recentTripStatus: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    textTransform: "capitalize",
  },
  recentTripRoute: {
    color: theme.colors.textPrimary,
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 24,
  },
  recentTripBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  recentTripPrice: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  actionSymbol: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
  },
  actionCopy: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  actionTitle: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 3,
  },
  chevron: {
    color: theme.colors.textSecondary,
    fontSize: 25,
    marginHorizontal: theme.spacing.sm,
  },
  pressed: {
    opacity: 0.7,
  },
  footerText: {
    color: theme.colors.textMuted,
    textAlign: "center",
    fontSize: 9,
    letterSpacing: 1.1,
    lineHeight: 16,
    marginTop: theme.spacing.xl,
  },
  summaryItem: {
    flex: 1,
  },

  summaryDivider: {
    width: 1,
    height: 38,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.md,
  },
});
