// ============================================================
//  app/(auth)/pin.js — Login con PIN
// ============================================================

import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

export default function PinLogin() {
  const { numero } = useLocalSearchParams();
  const { guardarSesion } = useAuth();
  const [pin, setPin] = useState('');
  const [cargando, setCargando] = useState(false);
  const inputRef = useRef(null);

  async function handleVerificarPin() {
    if (pin.length < 4) {
      Alert.alert('Error', 'Ingresa tu PIN.');
      return;
    }
    setCargando(true);
    try {
      const data = await api.loginConPin(numero, pin);
      await guardarSesion(
        data.access_token,
        data.perfil,
        numero,
        data.edificio_id,
        data.membresias || [],
        data.nombre || '',
      );
      router.replace('/');
    } catch (e) {
      Alert.alert('PIN incorrecto', 'Verifica tu PIN e intenta de nuevo.');
      setPin('');
      inputRef.current?.focus();
    } finally {
      setCargando(false);
    }
  }

  async function handleOlvidePin() {
    // Enviar OTP para resetear PIN
    try {
      await api.solicitarOTP(numero);
      router.push({ pathname: '/(auth)/verify', params: { numero, resetPin: 'true' } });
    } catch (e) {
      Alert.alert('Error', 'No se pudo enviar el codigo.');
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.titulo}>Ingresa tu PIN</Text>
        <Text style={styles.subtitulo}>{numero}</Text>

        <TextInput
          ref={inputRef}
          style={styles.inputPin}
          placeholder="••••"
          placeholderTextColor="rgba(255,255,255,0.3)"
          keyboardType="number-pad"
          value={pin}
          onChangeText={v => { if (v.length <= 6) setPin(v); }}
          maxLength={6}
          secureTextEntry
          autoFocus
          textAlign="center"
        />

        <TouchableOpacity
          style={[styles.boton, (cargando || pin.length < 4) && styles.botonDisabled]}
          onPress={handleVerificarPin}
          disabled={cargando || pin.length < 4}>
          {cargando
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.botonTexto}>Ingresar</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={styles.link} onPress={handleOlvidePin}>
          <Text style={styles.linkTexto}>Olvide mi PIN</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.link} onPress={() => router.back()}>
          <Text style={styles.linkTexto}>Cambiar numero</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#1E3A5F' },
  content:       { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  titulo:        { fontSize: 28, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  subtitulo:     { fontSize: 16, color: 'rgba(255,255,255,0.6)', marginBottom: 40 },
  inputPin:      { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 12,
                   padding: 20, fontSize: 32, fontWeight: '700', color: '#FFFFFF',
                   marginBottom: 24, backgroundColor: '#1A3347', letterSpacing: 12 },
  boton:         { backgroundColor: '#2196F3', borderRadius: 12, padding: 18,
                   alignItems: 'center', marginBottom: 16 },
  botonDisabled: { opacity: 0.4 },
  botonTexto:    { color: '#fff', fontSize: 16, fontWeight: '700' },
  link:          { alignItems: 'center', paddingVertical: 10 },
  linkTexto:     { color: 'rgba(255,255,255,0.7)', fontSize: 15 },
});
