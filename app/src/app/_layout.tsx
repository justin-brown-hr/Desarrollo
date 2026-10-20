import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { SyncManager } from '@/components/SyncManager';
import { DATABASE_NAME, migrateDbIfNeeded } from '@/db/database';
import { SessionProvider, useSession } from '@/services/session';
import { colors } from '@/theme';

function RootNavigator() {
  const { technician, ready } = useSession();
  if (!ready) return null;

  return (
    <>
      {technician && <SyncManager />}
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.white },
          headerTintColor: colors.ink,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Protected guard={!!technician}>
          <Stack.Screen name="index" options={{ title: 'Reportes de trabajo' }} />
          <Stack.Screen name="visit/[id]/index" options={{ title: 'Visita' }} />
          <Stack.Screen name="visit/[id]/machine/[machineId]" options={{ title: 'Máquina' }} />
          <Stack.Screen name="visit/[id]/close" options={{ title: 'Cierre y firmas' }} />
        </Stack.Protected>
        <Stack.Protected guard={!technician}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded}>
      <SessionProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </SessionProvider>
    </SQLiteProvider>
  );
}
