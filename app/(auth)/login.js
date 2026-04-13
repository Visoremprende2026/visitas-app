// ============================================================
//  app/(auth)/login.js — Login con numero de celular
//  Si tiene PIN → va a pantalla PIN
//  Si no tiene PIN → envia OTP como antes
// ============================================================

import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import { api } from '../../services/api';

export default function Login() {
  const [numero, setNumero] = useState('');
  const [cargando, setCargando] = useState(false);

async function handleContinuar() {
  const numeroLimpio = numero.trim();
  if (numeroLimpio.length < 9) {
    Alert.alert('Error', 'Ingresa un numero de celular valido.');
    return;
  }

  const numeroFormateado = numeroLimpio.startsWith('+')
    ? numeroLimpio
    : `+56${numeroLimpio.replace(/^0/, '')}`;

  setCargando(true);
  try {
    // Verificar si tiene PIN
    const response = await fetch('http://192.168.1.12:8000/auth/pin/estado-publico', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numero_celular: numeroFormateado }),
    });
    const estadoPin = await api.estadoPinPublico(numeroFormateado);

    if (estadoPin.tiene_pin) {
      router.push({ pathname: '/(auth)/pin', params: { numero: numeroFormateado } });
      return;
    }

    // Sin PIN → enviar OTP
    await api.solicitarOTP(numeroFormateado);
    router.push({ pathname: '/(auth)/verify', params: { numero: numeroFormateado } });

  } catch (e) {
    Alert.alert('Error', e.message || 'No se pudo procesar la solicitud.');
  } finally {
    setCargando(false);
  }
}

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.content}>
        <Text style={styles.titulo}>Bienvenido</Text>
        <Text style={styles.subtitulo}>Ingresa tu numero de celular para continuar</Text>

        <TextInput
          style={styles.input}
          placeholder="+56 9 1234 5678"
          placeholderTextColor="rgba(255,255,255,0.5)"
          keyboardType="phone-pad"
          value={numero}
          onChangeText={setNumero}
          autoFocus
          maxLength={15}
        />

        <TouchableOpacity
          style={[styles.boton, cargando && styles.botonDisabled]}
          onPress={handleContinuar}
          disabled={cargando}>
          {cargando
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.botonTexto}>Continuar</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#1E3A5F' },
  content:       { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  titulo:        { fontSize: 28, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  subtitulo:     { fontSize: 16, color: 'rgba(255,255,255,0.6)', marginBottom: 40, lineHeight: 22 },
  input:         { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 12,
                   padding: 16, fontSize: 18, color: '#FFFFFF', marginBottom: 20,
                   backgroundColor: '#1A3347' },
  boton:         { backgroundColor: '#2196F3', borderRadius: 12, padding: 18, alignItems: 'center' },
  botonDisabled: { opacity: 0.6 },
  botonTexto:    { color: '#fff', fontSize: 16, fontWeight: '700' },
});
