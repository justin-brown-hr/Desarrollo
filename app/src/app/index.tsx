import { Stack, router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, StatusBadge } from '@/components/ui';
import { deleteVisit, listVisits, saveVisit } from '@/db/database';
import { newVisit } from '@/domain/factory';
import type { Visit } from '@/domain/types';
import { deletePhoto } from '@/services/photos';
import { useSession } from '@/services/session';
import { onSyncChange, syncPending, type SyncResult } from '@/services/sync';
import { colors } from '@/theme';

const formatDate = (iso: string) => iso.split('-').reverse().join('/');

export default function Reports() {
  const db = useSQLiteContext();
  const { technician, logout } = useSession();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<SyncResult>();

  const load = useCallback(() => {
    listVisits(db).then(setVisits);
  }, [db]);

  useFocusEffect(load);

  useEffect(
    () =>
      onSyncChange(({ running, last }) => {
        setSyncing(running);
        if (last) setLastSync(last);
        if (!running) load();
      }),
    [load],
  );

  const waiting = visits.filter((v) => v.status === 'pending' || v.status === 'error').length;
  const syncMessage = syncing
    ? 'Enviando reportes…'
    : waiting
      ? lastSync?.offline
        ? `${waiting} por enviar · sin conexión, se enviarán automáticamente`
        : `${waiting} por enviar`
      : 'Todo enviado';

  const create = async () => {
    if (!technician) return;
    const visit = newVisit(technician);
    await saveVisit(db, visit);
    router.push({ pathname: '/visit/[id]', params: { id: visit.id } });
  };

  const remove = (v: Visit) =>
    Alert.alert('Eliminar borrador', `¿Eliminar la visita a ${v.client.company || 'cliente sin nombre'}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          v.machines.flatMap((m) => m.photos).forEach(deletePhoto);
          await deleteVisit(db, v.id);
          load();
        },
      },
    ]);

  const confirmLogout = () =>
    Alert.alert('Cerrar sesión', `¿Salir como ${technician?.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', onPress: logout },
    ]);

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={confirmLogout} hitSlop={8}>
              <Text style={{ color: colors.muted }}>{technician?.name} · Salir</Text>
            </Pressable>
          ),
        }}
      />
      <FlatList
        data={visits}
        keyExtractor={(v) => v.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Button title="+ Nueva visita" onPress={create} />
            <View style={styles.sync}>
              <Text style={styles.meta}>{syncMessage}</Text>
              <Button
                small
                variant="secondary"
                title="Enviar ahora"
                onPress={() => syncPending(db).catch(() => {})}
                loading={syncing}
                disabled={!waiting}
              />
            </View>
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>Aún no hay reportes. Cree una nueva visita para empezar.</Text>}
        renderItem={({ item: v }) => (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}
            onPress={() => router.push({ pathname: '/visit/[id]', params: { id: v.id } })}
            onLongPress={() => v.status === 'draft' && remove(v)}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.company}>{v.client.company || 'Cliente sin nombre'}</Text>
              <Text style={styles.meta}>
                {formatDate(v.date)} · {v.visitType || 'Sin tipo'} · {v.machines.length}{' '}
                {v.machines.length === 1 ? 'máquina' : 'máquinas'}
              </Text>
              {v.machines.some((m) => m.number) && (
                <Text style={styles.meta}>
                  {v.machines
                    .map((m) => m.number)
                    .filter(Boolean)
                    .join(', ')}
                </Text>
              )}
              {v.status === 'error' && v.lastError ? <Text style={styles.error}>{v.lastError}</Text> : null}
            </View>
            <StatusBadge status={v.status} />
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 10, width: '100%', maxWidth: 960, alignSelf: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 6,
  },
  sync: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 40, fontSize: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  company: { fontSize: 17, fontWeight: '700', color: colors.ink },
  meta: { color: colors.muted },
  error: { color: colors.danger, fontSize: 13 },
});
