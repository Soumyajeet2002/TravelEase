import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";

import { migrateDbIfNeeded } from "../database/migrations";
import { theme } from "../theme";

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="travelease.db" onInit={migrateDbIfNeeded}>
      <StatusBar style="light" backgroundColor={theme.colors.background} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: theme.colors.background,
          },
        }}
      />
    </SQLiteProvider>
  );
}
