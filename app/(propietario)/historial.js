// ============================================================
//  app/(propietario)/historial.js — Historial de accesos
// ============================================================

import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, Alert, RefreshControl
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '../../services/api';

function LogItem({ item }) {
  const fecha = new Date(item.timestamp).toLocaleString('es-CL', {
    dateStyle: 'short', timeStyle: 'short'
  });
  const esEntrada = item.accion === 'entrada';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardNumero}>{item.numero_invitado}</Text>
        <View style={[styles.badge, { backgroundColor: esEntrada ? '#E8F5E9' : '#E3F2FD' }]}>
          <Text style={[styles.badgeTexto, { color: esEntrada ? '#1D6A4A' : '#185FA5' }]}>
            {esEntrada ? 'Entrada' : 'Salida'}
          </Text>
        </View>
      </View>
      <Text style={styles.cardPuerta}>{item.puerta_nombre}</Text>
      <Text style={styles.cardFecha}>{fecha}</Text>
    </View>
  );
}

export default function Historial() {
  const [logs, setLogs] = useState([]);
  const [cargando, setCargando] = useState(true);

  useFocusEffect(
    useCallback(() => { cargar(); }, [])
  );

  async function cargar() {
    setCargando(true);
    try {
      const data = await api.logAccesos();
      setLogs(data);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <View style={styles.container}>
      {cargando ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#2E4A7A" />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <LogItem item={item} />}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} />}
          ListEmptyComponent={
            <Text style={styles.vacio}>No hay registros de acceso aun</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#1E3A5F' },
  card:        { borderRadius: 12, padding: 16, marginBottom: 10,
                 borderColor: '#FFFFFF', borderWidth: 0.5 },
  cardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardNumero:  { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  badge:       { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  badgeTexto:  { fontSize: 12, fontWeight: '600' },
  cardPuerta:  { fontSize: 13, color: '#F59E0B', fontWeight: '600', marginBottom: 2 },
  cardFecha:   { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  vacio:       { textAlign: 'center', marginTop: 60, color: 'rgba(255,255,255,0.4)', fontSize: 15 },
});
