// ============================================================
//  app/(propietario)/visitas.js — Lista de invitaciones
// ============================================================

import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, RefreshControl, ActivityIndicator
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

const ESTADO_COLOR = {
  activa:    { bg: '#E8F5E9', text: '#1D6A4A' },
  expirada:  { bg: '#FFF8E1', text: '#854F0B' },
  cancelada: { bg: '#FCEBEB', text: '#A32D2D' },
  usada:     { bg: '#E6F1FB', text: '#185FA5' },
};

const DIAS_LABELS = { '1':'Lun','2':'Mar','3':'Mie','4':'Jue','5':'Vie','6':'Sab','7':'Dom' };

function diasTexto(dias) {
  if (dias === '1234567') return 'Todos los dias';
  if (dias === '12345')   return 'Dias laborales';
  if (dias === '67')      return 'Fin de semana';
  return dias.split('').map(d => DIAS_LABELS[d]).join(', ');
}

function InvitacionCard({ item, onCancelar }) {
  const estado = ESTADO_COLOR[item.estado] || ESTADO_COLOR.activa;
  const desde = new Date(item.fecha_desde).toLocaleDateString('es-CL');
  const hasta = new Date(item.fecha_hasta).toLocaleDateString('es-CL');
  const horario = item.todo_el_dia ? 'Todo el dia' : `${item.hora_inicio} — ${item.hora_fin}`;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardNumero}>{item.numero_invitado}</Text>
        <View style={[styles.badge, { backgroundColor: estado.bg }]}>
          <Text style={[styles.badgeTexto, { color: estado.text }]}>{item.estado}</Text>
        </View>
      </View>
      <Text style={styles.cardPuerta}>{item.puerta_nombre}</Text>
      {item.unidad_destino ? <Text style={styles.cardUnidad}>Para: {item.unidad_destino}</Text> : null}
      <Text style={styles.cardDias}>{diasTexto(item.dias_permitidos)} — {horario}</Text>
      <Text style={styles.cardFecha}>{desde} → {hasta}</Text>
      {item.nota ? <Text style={styles.cardNota}>{item.nota}</Text> : null}
      {item.estado === 'activa' && (
        <TouchableOpacity style={styles.btnCancelar} onPress={() => onCancelar(item.id)}>
          <Text style={styles.btnCancelarTexto}>Cancelar invitacion</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function Visitas() {
  const { cerrarSesion, usuario } = useAuth();
  const [invitaciones, setInvitaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('activa');

  useFocusEffect(
    useCallback(() => { cargar(); }, [filtro])
  );

  async function cargar() {
    setCargando(true);
    try {
      const data = await api.listarInvitaciones(filtro, usuario.membresia_id);
      setInvitaciones(data);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setCargando(false);
    }
  }

  async function handleCancelar(id) {
    Alert.alert('Cancelar invitacion', '¿Seguro que deseas cancelarla?', [
      { text: 'No', style: 'cancel' },
      { text: 'Si, cancelar', style: 'destructive', onPress: async () => {
        try {
          await api.cancelarInvitacion(id);
          cargar();
        } catch (e) {
          Alert.alert('Error', e.message);
        }
      }},
    ]);
  }

  const filtros = ['activa', 'expirada', 'cancelada', 'todas'];

  return (
    <View style={styles.container}>
      {/* Header con boton Salir */}

      {/* Selector de filtro */}
      <View style={styles.filtros}>
        {filtros.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filtroBtn, filtro === f && styles.filtroBtnActivo]}
            onPress={() => setFiltro(f)}
          >
            <Text style={[styles.filtroTexto, filtro === f && styles.filtroTextoActivo]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {cargando ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#2E4A7A" />
      ) : (
        <FlatList
          data={invitaciones}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <InvitacionCard item={item} onCancelar={handleCancelar} />}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} />}
          ListEmptyComponent={
            <Text style={styles.vacio}>No hay invitaciones {filtro === 'todas' ? '' : filtro + 's'}</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#1E3A5F' },
  header:             { flexDirection: 'row', justifyContent: 'space-between',
                        alignItems: 'center', padding: 16, backgroundColor: '#1E3A5F',  paddingTop: 50, },
  headerTitulo:       { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  headerSalir:        { color: 'rgba(255,255,255,0.85)', fontSize: 14 },
  filtros:            { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#1E3A5F',
                        borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.15)' },
  filtroBtn:          { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F0F0F0' },
  filtroBtnActivo:    { backgroundColor: '#F59E0B' },
  filtroTexto:        { fontSize: 13, color: '#1E3A5F' },
  filtroTextoActivo:  { color: '#FFFFFF', fontWeight: '600' },
  card:               { borderRadius: 12, padding: 16, marginBottom: 12,
                        borderColor: '#FFFFFF', borderWidth: 0.5 },
  cardHeader:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardNumero:         { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  badge:              { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  badgeTexto:         { fontSize: 12, fontWeight: '600' },
  cardPuerta:         { fontSize: 14, color: '#F59E0B', fontWeight: '600', marginBottom: 2 },
  cardUnidad:         { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 2 },
  cardDias:           { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 2 },
  cardFecha:          { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 4 },
  cardNota:           { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontStyle: 'italic', marginTop: 4 },
  btnCancelar:        { marginTop: 12, paddingVertical: 8, alignItems: 'center',
                        borderWidth: 1, borderColor: '#EF4444', borderRadius: 8 },
  btnCancelarTexto:   { color: '#EF4444', fontSize: 14, fontWeight: '600' },
  vacio:              { textAlign: 'center', marginTop: 60, color: 'rgba(255,255,255,0.4)', fontSize: 15 },
});
