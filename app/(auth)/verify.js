// ============================================================
//  app/(auth)/verify.js — Verificacion OTP v2
//  Guarda membresias en la sesion
// ============================================================

import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

export default function Verify() {
  const { numero } = useLocalSearchParams();
  const { guardarSesion } = useAuth();
  const [codigo, setCodigo] = useState('');
  const [cargando, setCargando] = useState(false);
  const inputRef = useRef(null);

  async function handleVerificar() {
    if (codigo.length !== 6) {
      Alert.alert('Error', 'El codigo tiene 6 digitos.');
      return;
    }
    setCargando(true);
    try {
      const data = await api.verificarOTP(numero, codigo);
      await guardarSesion(
        data.access_token,
        data.perfil,
        numero,
        data.edificio_id,
        data.membresias || [],
        data.nombre || '',
      );

      // Verificar si tiene PIN creado
      try {
        const estadoPin = await api.estadoPin();
          console.log('Estado PIN:', JSON.stringify(estadoPin));
        if (!estadoPin.tiene_pin) {
          router.replace('/(auth)/crear-pin');
          return;
        }
      } catch (e) {
        console.log('Error estadoPin:', e.message);
        // continuar normalmente
      }

      router.replace('/');
    } catch (e) {
      Alert.alert('Codigo incorrecto', e.message || 'Verifica el codigo e intenta de nuevo.');
      setCodigo('');
      inputRef.current?.focus();
    } finally {
      setCargando(false);
    }
  }

  async function handleReenviar() {
    try {
      await api.solicitarOTP(numero);
      Alert.alert('Codigo enviado', 'Te enviamos un nuevo codigo SMS.');
    } catch (e) {
      Alert.alert('Error', 'No se pudo reenviar.');
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.titulo}>Codigo SMS</Text>
        <Text style={styles.subtitulo}>
          Ingresa el codigo de 6 digitos enviado a{'\n'}
          <Text style={styles.numero}>{numero}</Text>
        </Text>
        <TextInput
          ref={inputRef}
          style={styles.inputCodigo}
          placeholder="------"
          placeholderTextColor="#CCC"
          keyboardType="number-pad"
          value={codigo}
          onChangeText={v => { if (v.length <= 6) setCodigo(v); }}
          maxLength={6}
          autoFocus
          textAlign="center"
          letterSpacing={12}
        />
        <TouchableOpacity
          style={[styles.boton, (cargando || codigo.length < 6) && styles.botonDisabled]}
          onPress={handleVerificar}
          disabled={cargando || codigo.length < 6}>
          {cargando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonTexto}>Verificar</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.link} onPress={handleReenviar}>
          <Text style={styles.linkTexto}>No recibi el codigo — reenviar</Text>
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
  titulo:        { fontSize: 28, fontWeight: '700', color: '#F59E0B', marginBottom: 8 },
  subtitulo:     { fontSize: 16, color: 'rgba(255,255,255,0.85)', marginBottom: 40, lineHeight: 24 },
  numero:        { fontWeight: '700', color: '#F59E0B' },
  inputCodigo:   { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 20,
                   fontSize: 32, fontWeight: '700', color: '#FFFFFF', marginBottom: 24 },
  boton:         { backgroundColor: '#2196F3', borderRadius: 12, padding: 18, alignItems: 'center', marginBottom: 16 },
  botonDisabled: { opacity: 0.4 },
  botonTexto:    { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  link:          { alignItems: 'center', paddingVertical: 10 },
  linkTexto:     { color: '#F59E0B', fontSize: 15 },
});
