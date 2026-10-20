import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, Text } from 'react-native';
import { SignaturePad } from '@/components/SignaturePad';
import { Button, Field, Issues, Row, Screen, Section } from '@/components/ui';
import { nowTime } from '@/domain/factory';
import { CERTIFICATION, HABEAS_DATA } from '@/domain/legal';
import type { SignOff } from '@/domain/types';
import { signOffIssues, visitIssues } from '@/domain/validation';
import { useVisit } from '@/hooks/useVisit';
import { syncPending } from '@/services/sync';
import { totalHours } from '@/pdf/reportHtml';
import { colors } from '@/theme';

const EMPTY_SIGNOFF: SignOff = { clientName: '', clientDocument: '', clientSignature: '', technicianSignature: '' };

export default function CloseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const { visit, loaded, update } = useVisit(id);
  const [signing, setSigning] = useState(false);

  // Exit time defaults to the moment the technician reaches this screen.
  const needsExitTime = !!visit && visit.status === 'draft' && !visit.exitTime;
  useEffect(() => {
    if (needsExitTime) update((v) => ({ ...v, exitTime: nowTime() }));
  }, [needsExitTime, update]);

  if (!visit) {
    return loaded ? <Text style={{ padding: 16 }}>Visita no encontrada</Text> : null;
  }

  const locked = visit.status !== 'draft';
  const signOff = visit.signOff ?? EMPTY_SIGNOFF;
  const setSignOff = (patch: Partial<SignOff>) =>
    update((v) => ({ ...v, signOff: { ...(v.signOff ?? EMPTY_SIGNOFF), ...patch } }));
  const issues = [...visitIssues(visit), ...signOffIssues(visit)];

  const finish = () =>
    Alert.alert(
      'Finalizar visita',
      `Se generarán ${visit.machines.length} ${visit.machines.length === 1 ? 'reporte' : 'reportes'} y se enviarán a la empresa y a ${visit.client.email}. Después no se podrá editar.`,
      [
        { text: 'Revisar', style: 'cancel' },
        {
          text: 'Finalizar',
          onPress: () => {
            update((v) => ({ ...v, status: 'pending' }));
            router.dismissTo('/');
            // Sends now if online; otherwise SyncManager retries when the connection returns.
            syncPending(db).catch(() => {});
          },
        },
      ],
    );

  return (
    <Screen scrollEnabled={!signing}>
      <Section title="Resumen">
        <Text style={{ fontSize: 16, fontWeight: '700' }}>{visit.client.company}</Text>
        {visit.machines.map((m, i) => (
          <Text key={m.id} style={{ color: colors.muted }}>
            {i + 1}. {m.brandModel} · Serie {m.serial}
          </Text>
        ))}
        <Row>
          <Field label="Hora de ingreso" value={visit.entryTime} editable={false} />
          <Field
            label="Hora de salida"
            required
            value={visit.exitTime}
            onChangeText={(exitTime) => update((v) => ({ ...v, exitTime }))}
            editable={!locked}
            placeholder="HH:MM"
            keyboardType="numbers-and-punctuation"
            right={
              !locked && (
                <Button
                  small
                  variant="secondary"
                  title="Ahora"
                  onPress={() => update((v) => ({ ...v, exitTime: nowTime() }))}
                />
              )
            }
          />
          <Field label="Total" value={totalHours(visit.entryTime, visit.exitTime)} editable={false} />
        </Row>
      </Section>

      <Section title="Recibe el servicio">
        <Text style={{ color: colors.muted, fontSize: 13 }}>{CERTIFICATION}</Text>
        <Text style={{ color: colors.muted, fontSize: 13 }}>{HABEAS_DATA}</Text>
        <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '600' }}>
          Una sola firma aplica a todas las máquinas de esta visita.
        </Text>
        <Row>
          <Field
            label="Nombre"
            required
            value={signOff.clientName}
            onChangeText={(clientName) => setSignOff({ clientName })}
            editable={!locked}
          />
          <Field
            label="Documento No."
            required
            value={signOff.clientDocument}
            onChangeText={(clientDocument) => setSignOff({ clientDocument })}
            editable={!locked}
            keyboardType="numbers-and-punctuation"
          />
        </Row>
        <Row>
          <SignaturePad
            label="Firma y sello del cliente"
            value={signOff.clientSignature}
            onChange={(clientSignature) => setSignOff({ clientSignature })}
            onDrawingChange={setSigning}
            disabled={locked}
          />
          <SignaturePad
            label={`Firma técnico · ${visit.technicianName}`}
            value={signOff.technicianSignature}
            onChange={(technicianSignature) => setSignOff({ technicianSignature })}
            onDrawingChange={setSigning}
            disabled={locked}
          />
        </Row>
      </Section>

      {!locked && (
        <>
          <Issues items={issues} />
          <Button title="Finalizar y enviar" onPress={finish} disabled={issues.length > 0} />
        </>
      )}
    </Screen>
  );
}
