// ============================================================
//  app/(admin)/invitaciones.js — Todas las invitaciones del edificio
// ============================================================

import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, RefreshControl, ActivityIndicator, TextInput
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';

const ESTADO_COLOR = {
  activa:    { bg: '#E8F5E9', text: '#1D6A4A' },
  expirada:  { bg: '#FFF8E1', text: '#854F0B' },
  cancelada: { bg: '#FCEBEB', text: '#A32D2D' },
};

const DIAS_LABELS = { '1':'L','2':'M','3':'X','4':'J','5':'V','6':'S','7':'D' };
function diasTexto(dias) {
  if (dias === '1234567') return 'Todos los dias';
  if (dias === '12345')   return 'Laborales';
  return dias.split('').map(d => DIAS_LABELS[d]).join(' ');
}

export default function AdminInvitaciones() {
  const { cerrarSesion, usuario } = useAuth();
  const [invitaciones, setInvitaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('activa');
  const [busqueda, setBusqueda] = useState('');

  useFocusEffect(useCallback(() => { cargar(); }, [filtro]));

  async function cargar() {
    setCargando(true);
    try {
      const data = await api.adminInvitaciones(filtro);
      setInvitaciones(data);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setCargando(false);
    }
  }

  async function handleCancelar(id, numero) {
    Alert.alert('Cancelar invitacion', `¿Cancelar invitacion de ${numero}?`, [
      { text: 'No', style: 'cancel' },
      { text: 'Si, cancelar', style: 'destructive', onPress: async () => {
        try {
          await api.adminCancelarInvitacion(id);
          cargar();
        } catch (e) {
          Alert.alert('Error', e.message);
        }
      }},
    ]);
  }

  const filtradas = invitaciones.filter(inv =>
    busqueda === '' ||
    inv.numero_invitado.includes(busqueda) ||
    (inv.unidad_propietario || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (inv.nombre_propietario || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitulo}>Invitaciones</Text>
        <TouchableOpacity onPress={cerrarSesion}>
          <Text style={styles.headerSalir}>Salir</Text>
        </TouchableOpacity>
      </View>

      <TextInput style={styles.buscador} placeholder="Buscar por numero, unidad o propietario..."
        placeholderTextColor="rgba(229,231,235,0.5)" value={busqueda} onChangeText={setBusqueda} />

      <View style={styles.filtros}>
        {['activa', 'expirada', 'cancelada', 'todas'].map(f => (
          <TouchableOpacity key={f}
            style={[styles.filtroBtn, filtro === f && styles.filtroBtnActivo]}
            onPress={() => setFiltro(f)}>
            <Text style={[styles.filtroTexto, filtro === f && styles.filtroTextoActivo]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {cargando ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#854F0B" />
      ) : (
        <FlatList
          data={filtradas}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} />}
          ListEmptyComponent={<Text style={styles.vacio}>No hay invitaciones</Text>}
          renderItem={({ item }) => {
            const estado = ESTADO_COLOR[item.estado] || ESTADO_COLOR.activa;
            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardUnidad}>{item.unidad_propietario || 'Sin unidad'}</Text>
                  <View style={[styles.badge, { backgroundColor: estado.bg }]}>
                    <Text style={[styles.badgeTexto, { color: estado.text }]}>{item.estado}</Text>
                  </View>
                </View>
                <Text style={styles.cardProp}>{item.nombre_propietario} → {item.numero_invitado}</Text>
                {item.unidad_destino ? <Text style={styles.cardDest}>Para: {item.unidad_destino}</Text> : null}
                <Text style={styles.cardInfo}>{diasTexto(item.dias_permitidos)} | {item.todo_el_dia ? 'Todo el dia' : `${item.hora_inicio}-${item.hora_fin}`}</Text>
                <Text style={styles.cardInfo}>Hasta: {new Date(item.fecha_hasta).toLocaleDateString('es-CL')}</Text>
                {item.estado === 'activa' && (
                  <TouchableOpacity style={styles.btnCancelar}
                    onPress={() => handleCancelar(item.id, item.numero_invitado)}>
                    <Text style={styles.btnCancelarTexto}>Cancelar</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#1E3A5F' },
  header:             { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                        paddingTop: 50, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#1E3A5F' },
  headerTitulo:       { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  headerSalir:        { color: 'rgba(255,255,255,0.85)', fontSize: 14 },
  buscador:           { margin: 12, padding: 12, backgroundColor: '#1E3A5F', borderRadius: 10,
                        borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', fontSize: 14 },
  filtros:            { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 4 },
  filtroBtn:          { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F0F0F0' },
  filtroBtnActivo:    { backgroundColor: '#F59E0B' },
  filtroTexto:        { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  filtroTextoActivo:  { color: '#FFFFFF', fontWeight: '600' },
  card:               { backgroundColor: '#2196F3', borderRadius: 12, padding: 16, marginBottom: 10,
                        borderColor: '#FFFFFF', borderWidth: 0.5 },
  cardHeader:         { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  cardUnidad:         { fontSize: 15, fontWeight: '700', color: '#633806' },
  badge:              { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  badgeTexto:         { fontSize: 12, fontWeight: '600' },
  cardProp:           { fontSize: 13, color: '#FFFFFF', marginBottom: 2 },
  cardDest:           { fontSize: 13, color: '#F59E0B', fontWeight: '600', marginBottom: 2 },
  cardInfo:           { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 2 },
  btnCancelar:        { marginTop: 10, paddingVertical: 8, alignItems: 'center',
                        borderWidth: 1, borderColor: '#EF4444', borderRadius: 8 },
  btnCancelarTexto:   { color: '#EF4444', fontSize: 13, fontWeight: '600' },
  vacio:              { textAlign: 'center', marginTop: 60, color: 'rgba(255,255,255,0.4)', fontSize: 15 },
});
