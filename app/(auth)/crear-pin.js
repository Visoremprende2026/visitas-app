// ============================================================
//  app/(auth)/crear-pin.js — Crear PIN primera vez
// ============================================================

import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import { api } from '../../services/api';

export default function CrearPin() {
  const [pin, setPin] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [cargando, setCargando] = useState(false);

  async function handleCrearPin() {
    if (pin.length < 4) {
      Alert.alert('Error', 'El PIN debe tener al menos 4 digitos.');
      return;
    }
    if (pin !== confirmar) {
      Alert.alert('Error', 'Los PINs no coinciden.');
      return;
    }
    setCargando(true);
    try {
      await api.crearPin(pin);
      Alert.alert('PIN creado', 'Tu PIN fue creado correctamente.', [
        { text: 'OK', onPress: () => router.replace('/') }
      ]);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.titulo}>Crea tu PIN</Text>
        <Text style={styles.subtitulo}>
          Elige un PIN de 4 a 6 digitos para acceder a la app sin necesidad de codigo SMS.
        </Text>

        <Text style={styles.label}>PIN</Text>
        <TextInput
          style={styles.inputPin}
          placeholder="••••"
          placeholderTextColor="rgba(255,255,255,0.3)"
          keyboardType="number-pad"
          value={pin}
          onChangeText={v => { if (v.length <= 6) setPin(v); }}
          maxLength={6}
          secureTextEntry
          textAlign="center"
        />

        <Text style={styles.label}>Confirmar PIN</Text>
        <TextInput
          style={styles.inputPin}
          placeholder="••••"
          placeholderTextColor="rgba(255,255,255,0.3)"
          keyboardType="number-pad"
          value={confirmar}
          onChangeText={v => { if (v.length <= 6) setConfirmar(v); }}
          maxLength={6}
          secureTextEntry
          textAlign="center"
        />

        <TouchableOpacity
          style={[styles.boton, (cargando || pin.length < 4) && styles.botonDisabled]}
          onPress={handleCrearPin}
          disabled={cargando || pin.length < 4}>
          {cargando
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.botonTexto}>Crear PIN</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#1E3A5F' },
  content:       { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  titulo:        { fontSize: 28, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  subtitulo:     { fontSize: 15, color: 'rgba(255,255,255,0.6)', marginBottom: 32, lineHeight: 22 },
  label:         { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 8 },
  inputPin:      { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 12,
                   padding: 20, fontSize: 32, fontWeight: '700', color: '#FFFFFF',
                   marginBottom: 20, backgroundColor: '#1A3347', letterSpacing: 12 },
  boton:         { backgroundColor: '#2196F3', borderRadius: 12, padding: 18,
                   alignItems: 'center', marginTop: 8 },
  botonDisabled: { opacity: 0.4 },
  botonTexto:    { color: '#fff', fontSize: 16, fontWeight: '700' },
});
