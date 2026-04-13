// ============================================================
//  app/(admin)/propietarios.js — Lista de propietarios del edificio
// ============================================================

import { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, RefreshControl, TextInput } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '../../services/api';

export default function AdminPropietarios() {
  const [propietarios, setPropietarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  useFocusEffect(useCallback(() => { cargar(); }, []));

  async function cargar() {
    setCargando(true);
    try {
      const data = await api.adminPropietarios();
      setPropietarios(data);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setCargando(false);
    }
  }

  const filtrados = propietarios.filter(p =>
    busqueda === '' ||
    (p.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    p.numero_celular.includes(busqueda) ||
    (p.unidad || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <TextInput style={styles.buscador}
        placeholder="Buscar por nombre, numero o unidad..."
        placeholderTextColor="rgba(229,231,235,0.5)" value={busqueda} onChangeText={setBusqueda} />

      {cargando ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#854F0B" />
      ) : (
        <FlatList
          data={filtrados}
          keyExtractor={item => item.membresia_id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} />}
          ListEmptyComponent={<Text style={styles.vacio}>No hay propietarios registrados</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardUnidad}>{item.unidad || 'Sin unidad'}</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeTexto}>{item.rol}</Text>
                </View>
              </View>
              <Text style={styles.cardNombre}>{item.nombre || 'Sin nombre'}</Text>
              <Text style={styles.cardNumero}>{item.numero_celular}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#1E3A5F' },
  buscador:    { margin: 12, padding: 12, backgroundColor: '#1E3A5F', borderRadius: 10,
                 borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', fontSize: 14 },
  card:        { backgroundColor: '#E8445A', borderRadius: 12, padding: 16, marginBottom: 10,
                 borderColor: '#FFFFFF', borderWidth: 0.5 },
  cardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardUnidad:  { fontSize: 16, fontWeight: '700', color: '#633806' },
  badge:       { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, backgroundColor: 'rgba(245,158,11,0.15)' },
  badgeTexto:  { fontSize: 12, fontWeight: '600', color: '#633806' },
  cardNombre:  { fontSize: 15, color: '#FFFFFF', marginBottom: 2 },
  cardNumero:  { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  vacio:       { textAlign: 'center', marginTop: 60, color: 'rgba(255,255,255,0.4)', fontSize: 15 },
});
