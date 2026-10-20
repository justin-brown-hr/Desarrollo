import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { CustomParams } from '@/components/CustomParams';
import { PartsEditor } from '@/components/PartsEditor';
import { PhotoStrip } from '@/components/PhotoStrip';
import { Button, Chips, Field, Row, Screen, Section } from '@/components/ui';
import { adjustmentsFor } from '@/domain/factory';
import { TECHNOLOGIES, TECHNOLOGY_LIST } from '@/domain/technologies';
import type { MachineReport } from '@/domain/types';
import { useVisit } from '@/hooks/useVisit';
import { colors } from '@/theme';

export default function MachineScreen() {
  const { id, machineId } = useLocalSearchParams<{ id: string; machineId: string }>();
  const { visit, loaded, update } = useVisit(id);
  const machine = visit?.machines.find((m) => m.id === machineId);

  if (!visit || !machine) {
    return loaded ? <Text style={{ padding: 16 }}>Máquina no encontrada</Text> : null;
  }

  const locked = visit.status !== 'draft';
  const set = (patch: Partial<MachineReport>) =>
    update((v) => ({ ...v, machines: v.machines.map((m) => (m.id === machineId ? { ...m, ...patch } : m)) }));
  const tech = TECHNOLOGIES[machine.technology];

  return (
    <Screen>
      <Stack.Screen options={{ title: machine.number ?? (machine.brandModel || 'Máquina') }} />

      <Section title="Equipo">
        <Row>
          <Field
            label="Marca / modelo"
            required
            value={machine.brandModel}
            onChangeText={(brandModel) => set({ brandModel })}
            editable={!locked}
          />
          <Field
            label="Serie"
            required
            value={machine.serial}
            onChangeText={(serial) => set({ serial })}
            editable={!locked}
            autoCapitalize="characters"
          />
        </Row>
        <Field
          label="Línea de trabajo"
          value={machine.workLine}
          onChangeText={(workLine) => set({ workLine })}
          editable={!locked}
        />
        <Text style={{ fontSize: 12, color: colors.muted, textTransform: 'uppercase' }}>Tecnología</Text>
        <Chips
          options={TECHNOLOGY_LIST.map((t) => ({ value: t.id, label: t.label }))}
          value={machine.technology}
          onChange={(technology) =>
            set({ technology, finalAdjustments: adjustmentsFor(technology, machine.finalAdjustments) })
          }
          disabled={locked}
        />
      </Section>

      <Section title="Estado inicial">
        <Field
          label="Cómo se encontró el equipo"
          multiline
          value={machine.initialState}
          onChangeText={(initialState) => set({ initialState })}
          editable={!locked}
        />
      </Section>

      <Section title="Trabajos ejecutados">
        <Field
          label="Trabajos realizados"
          required
          multiline
          value={machine.workDone}
          onChangeText={(workDone) => set({ workDone })}
          editable={!locked}
        />
      </Section>

      <Section title={`Ajustes finales · ${tech.label}`}>
        {!tech.params.length ? (
          <CustomParams
            rows={machine.finalAdjustments}
            onChange={(finalAdjustments) => set({ finalAdjustments })}
            disabled={locked}
          />
        ) : machine.finalAdjustments.length ? (
          <Row>
            {machine.finalAdjustments.map((p) => {
              const def = tech.params.find((d) => d.key === p.key);
              return (
                <Field
                  key={p.key}
                  style={{ flexBasis: 180 }}
                  label={p.unit ? `${p.label} (${p.unit})` : p.label}
                  value={p.value}
                  editable={!locked}
                  keyboardType={def?.kind === 'number' ? 'decimal-pad' : 'default'}
                  onChangeText={(value) =>
                    set({
                      finalAdjustments: machine.finalAdjustments.map((x) => (x.key === p.key ? { ...x, value } : x)),
                    })
                  }
                />
              );
            })}
          </Row>
        ) : (
          <Text style={{ color: colors.muted }}>
            Esta tecnología no tiene parámetros predefinidos. Use observaciones.
          </Text>
        )}
      </Section>

      <Section title="Observaciones">
        <Field
          label="Observaciones y recomendaciones"
          multiline
          value={machine.observations}
          onChangeText={(observations) => set({ observations })}
          editable={!locked}
        />
      </Section>

      <Section title="Piezas usadas">
        <PartsEditor parts={machine.parts} onChange={(parts) => set({ parts })} disabled={locked} />
      </Section>

      <Section title="Fotos">
        <PhotoStrip photos={machine.photos} onChange={(photos) => set({ photos })} disabled={locked} />
      </Section>

      <View style={{ alignItems: 'flex-end' }}>
        <Button title={locked ? 'Volver' : 'Listo'} onPress={() => router.back()} />
      </View>
    </Screen>
  );
}
