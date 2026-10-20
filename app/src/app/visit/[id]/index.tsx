import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Chips, Field, Issues, Row, Screen, Section, StatusBadge } from '@/components/ui';
import { newMachine, nowTime } from '@/domain/factory';
import { TECHNOLOGIES, VISIT_TYPES } from '@/domain/technologies';
import type { ClientInfo, MachineReport } from '@/domain/types';
import { isEmail, machineIssues, visitIssues } from '@/domain/validation';
import { useVisit } from '@/hooks/useVisit';
import { deletePhoto } from '@/services/photos';
import { colors } from '@/theme';

export default function VisitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { visit, loaded, update } = useVisit(id);

  if (!visit) {
    return loaded ? <Text style={{ padding: 16 }}>Visita no encontrada</Text> : null;
  }

  const locked = visit.status !== 'draft';
  const issues = visitIssues(visit);
  const setClient = (patch: Partial<ClientInfo>) => update((v) => ({ ...v, client: { ...v.client, ...patch } }));

  const openMachine = (machineId: string) =>
    router.push({ pathname: '/visit/[id]/machine/[machineId]', params: { id: visit.id, machineId } });

  const addMachine = () => {
    // New machines default to the technology of the previous one (usually the same at one client).
    const machine = newMachine(visit.machines.at(-1)?.technology ?? 'CIJ');
    update((v) => ({ ...v, machines: [...v.machines, machine] }));
    openMachine(machine.id);
  };

  const removeMachine = (m: MachineReport) =>
    Alert.alert('Eliminar máquina', `¿Eliminar ${m.brandModel || 'esta máquina'} de la visita?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          m.photos.forEach(deletePhoto);
          update((v) => ({ ...v, machines: v.machines.filter((x) => x.id !== m.id) }));
        },
      },
    ]);

  return (
    <Screen>
      <Stack.Screen options={{ title: visit.client.company || 'Nueva visita' }} />

      {locked && (
        <View style={styles.lockedBar}>
          <StatusBadge status={visit.status} />
          <Text style={{ color: colors.muted, flex: 1 }}>Visita finalizada: solo lectura.</Text>
        </View>
      )}

      <Section title="Visita">
        <Text style={styles.label}>
          Tipo de visita <Text style={{ color: colors.danger }}>*</Text>
        </Text>
        <Chips
          options={VISIT_TYPES.map((t) => ({ value: t, label: t }))}
          value={visit.visitType}
          onChange={(visitType) => update((v) => ({ ...v, visitType }))}
          disabled={locked}
        />
        <Row>
          <Field
            label="Fecha (AAAA-MM-DD)"
            value={visit.date}
            onChangeText={(date) => update((v) => ({ ...v, date }))}
            editable={!locked}
            keyboardType="numbers-and-punctuation"
          />
          <Field
            label="Hora de ingreso"
            required
            value={visit.entryTime}
            onChangeText={(entryTime) => update((v) => ({ ...v, entryTime }))}
            editable={!locked}
            placeholder="HH:MM"
            keyboardType="numbers-and-punctuation"
            right={
              !locked && (
                <Button
                  small
                  variant="secondary"
                  title="Ahora"
                  onPress={() => update((v) => ({ ...v, entryTime: nowTime() }))}
                />
              )
            }
          />
        </Row>
      </Section>

      <Section title="Cliente">
        <Row>
          <Field
            label="Compañía"
            required
            value={visit.client.company}
            onChangeText={(company) => setClient({ company })}
            editable={!locked}
          />
          <Field
            label="Ciudad"
            value={visit.client.city}
            onChangeText={(city) => setClient({ city })}
            editable={!locked}
          />
        </Row>
        <Row>
          <Field
            label="Contacto"
            value={visit.client.contact}
            onChangeText={(contact) => setClient({ contact })}
            editable={!locked}
          />
          <Field
            label="Cargo"
            value={visit.client.role}
            onChangeText={(role) => setClient({ role })}
            editable={!locked}
          />
        </Row>
        <Field
          label="Celular del cliente"
          value={visit.client.phone ?? ''}
          onChangeText={(phone) => setClient({ phone })}
          editable={!locked}
          keyboardType="phone-pad"
        />
        <Field
          label="Correo del cliente (recibe el reporte)"
          required
          value={visit.client.email}
          onChangeText={(email) => setClient({ email: email.trim() })}
          error={!!visit.client.email && !isEmail(visit.client.email)}
          editable={!locked}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </Section>

      <Section title={`Máquinas (${visit.machines.length})`}>
        <Text style={{ color: colors.muted }}>Cada máquina genera su propio reporte con número consecutivo.</Text>
        {visit.machines.map((m, i) => {
          const mi = machineIssues(m);
          return (
            <Pressable
              key={m.id}
              style={({ pressed }) => [styles.machine, pressed && { opacity: 0.8 }]}
              onPress={() => openMachine(m.id)}
              onLongPress={() => !locked && removeMachine(m)}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.machineTitle}>
                  {m.number ? `${m.number} · ` : `${i + 1}. `}
                  {m.brandModel || 'Sin marca / modelo'}
                </Text>
                <Text style={{ color: colors.muted }}>
                  {TECHNOLOGIES[m.technology].label} · Serie {m.serial || '—'}
                </Text>
                {mi.length > 0 && <Text style={{ color: colors.danger, fontSize: 13 }}>Falta: {mi.join(', ')}</Text>}
              </View>
              <Text style={{ color: colors.muted, fontSize: 22 }}>›</Text>
            </Pressable>
          );
        })}
        {!locked && (
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button variant="secondary" title="+ Agregar máquina" onPress={addMachine} />
            {visit.machines.length > 0 && (
              <Text style={{ color: colors.muted, fontSize: 13 }}>Mantenga presionada una máquina para eliminarla</Text>
            )}
          </View>
        )}
      </Section>

      {!locked && (
        <>
          <Issues items={issues} />
          <Button
            title="Continuar a cierre y firmas"
            onPress={() => router.push({ pathname: '/visit/[id]/close', params: { id: visit.id } })}
            disabled={issues.length > 0}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  lockedBar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  machine: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    gap: 12,
  },
  machineTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
});
