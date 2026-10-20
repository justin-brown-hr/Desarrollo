import { useState } from 'react';
import { Image, KeyboardAvoidingView, StyleSheet, Text, View } from 'react-native';
import { Button, Field } from '@/components/ui';
import { useSession } from '@/services/session';
import { colors } from '@/theme';

export default function Login() {
  const { login } = useSession();
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      await login(username, pin);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo ingresar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <View style={styles.card}>
        <Image source={require('../../assets/brand/logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>Reportes de trabajo</Text>
        <Field label="Usuario" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} />
        <Field
          label="PIN"
          value={pin}
          onChangeText={setPin}
          secureTextEntry
          keyboardType="number-pad"
          onSubmitEditing={submit}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title="Ingresar" onPress={submit} loading={busy} disabled={!username.trim() || !pin} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: colors.bg },
  card: {
    width: '100%',
    maxWidth: 420,
    gap: 14,
    padding: 24,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  logo: { width: 180, height: 90, alignSelf: 'center' },
  title: { textAlign: 'center', fontSize: 16, color: colors.muted, marginBottom: 8 },
  error: { color: colors.danger },
});
