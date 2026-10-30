import { Stack } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { theme } from "../theme";

export default function DatabaseDebugScreen() {
  const db = useSQLiteContext();
  const [output, setOutput] = useState("Loading database…");

  useEffect(() => {
    async function inspect() {
      try {
        const trips = await db.getAllAsync("SELECT * FROM trips");
        const expenses = await db.getAllAsync("SELECT * FROM expenses");
        const settings = await db.getAllAsync("SELECT * FROM app_settings");

        setOutput(
          JSON.stringify(
            {
              database: "travelease.db",
              tripCount: trips.length,
              expenseCount: expenses.length,
              trips,
              expenses,
              settings,
            },
            null,
            2,
          ),
        );
      } catch (error) {
        setOutput(String(error));
      }
    }

    void inspect();
  }, [db]);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: "Database Inspector" }} />
      <Text style={styles.heading}>Local database</Text>
      <Text style={styles.subtitle}>
        Records currently stored on this device
      </Text>
      <ScrollView style={styles.panel}>
        <Text selectable style={styles.json}>
          {output}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
  },
  heading: {
    color: theme.colors.textPrimary,
    fontSize: 26,
    fontWeight: "800",
  },
  subtitle: {
    color: theme.colors.textSecondary,
    marginTop: 8,
    marginBottom: 16,
  },
  panel: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: 12,
  },
  json: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    lineHeight: 19,
    fontFamily: "monospace",
  },
});
