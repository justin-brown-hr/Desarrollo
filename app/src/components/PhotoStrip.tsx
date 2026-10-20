import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MAX_PHOTOS_PER_MACHINE } from '@/domain/types';
import { deletePhoto, takePhoto } from '@/services/photos';
import { colors } from '@/theme';
import { Button } from './ui';

interface Props {
  photos: string[];
  onChange: (photos: string[]) => void;
  disabled?: boolean;
}

export function PhotoStrip({ photos, onChange, disabled }: Props) {
  const [busy, setBusy] = useState(false);
  const full = photos.length >= MAX_PHOTOS_PER_MACHINE;

  const add = async (fromCamera: boolean) => {
    setBusy(true);
    try {
      const uri = await takePhoto(fromCamera);
      if (uri) onChange([...photos, uri]);
    } catch (e) {
      Alert.alert('Foto', e instanceof Error ? e.message : 'No se pudo agregar la foto');
    } finally {
      setBusy(false);
    }
  };

  const remove = (uri: string) =>
    Alert.alert('Eliminar foto', '¿Eliminar esta foto del reporte?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          deletePhoto(uri);
          onChange(photos.filter((p) => p !== uri));
        },
      },
    ]);

  return (
    <View style={{ gap: 10 }}>
      <View style={styles.strip}>
        {photos.map((uri) => (
          <Pressable key={uri} onLongPress={() => !disabled && remove(uri)}>
            <Image source={{ uri }} style={styles.thumb} />
          </Pressable>
        ))}
        {!photos.length && <Text style={styles.empty}>Sin fotos (máximo {MAX_PHOTOS_PER_MACHINE})</Text>}
      </View>
      {!disabled && (
        <View style={styles.actions}>
          <Button small title="Tomar foto" onPress={() => add(true)} disabled={full} loading={busy} />
          <Button small variant="secondary" title="Galería" onPress={() => add(false)} disabled={full || busy} />
          {photos.length > 0 && <Text style={styles.empty}>Mantenga presionada una foto para eliminarla</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  thumb: { width: 160, height: 120, borderRadius: 8, backgroundColor: colors.soft },
  actions: { flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
  empty: { color: colors.muted, fontSize: 13 },
});
