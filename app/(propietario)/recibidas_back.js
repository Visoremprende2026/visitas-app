// ============================================================
//  app/(propietario)/recibidas.js — Invitaciones recibidas
//  Invitaciones donde el propietario es el invitado
// ============================================================

import { useState, useCallback } from 'react';
import { useBLE } from '../../hooks/useBLE';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, RefreshControl
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '../../services/api';

const DIAS_LABELS = { '1':'Lun','2':'Mar','3':'Mie','4':'Jue','5':'Vie','6':'Sab','7':'Dom' };

function diasTexto(dias) {
  if (dias === '1234567') return 'Todos los dias';
  if (dias === '12345')   return 'Dias laborales';
  if (dias === '67')      return 'Fin de semana';
  return dias.split('').map(d => DIAS_LABELS[d]).join(', ');
}

export default function Recibidas() {
  const [invitaciones, setInvitaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [abriendo, setAbriendo] = useState(null);
  const [beaconDetectado, setBeaconDetectado] = useState(false);
  const [invitacionBeacon, setInvitacionBeacon] = useState(null);

  useFocusEffect(useCallback(() => { cargar(); }, []));

  const uuidsBeacon = invitaciones.map(inv => inv.uuid_ble).filter(Boolean);

  const { escaneando } = useBLE(uuidsBeacon, (uuid_ble) => {
    const inv = invitaciones.find(i => i.uuid_ble?.toLowerCase() === uuid_ble.toLowerCase());
    if (inv) {
      setBeaconDetectado(true);
      setInvitacionBeacon(inv);
    }
  });

  async function cargar() {
    setCargando(true);
    try {
      const data = await api.invitacionesActivas();
      setInvitaciones(data);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setCargando(false);
    }
  }

  async function handleSolicitarAcceso(inv) {
    if (abriendo) return;
    setAbriendo(inv.id);
    try {
      const data = await api.solicitarAcceso(inv.uuid_ble, inv.id);
      const esEntrada = data.accion === 'entrada';
      Alert.alert(
        esEntrada ? 'Barrera abierta' : 'Hasta pronto',
        esEntrada ? 'Ingreso registrado' : 'Salida registrada'
      );
      cargar(); // recargar para actualizar presencia
    } catch (e) {
      Alert.alert('Acceso denegado', e.message);
    } finally {
      setAbriendo(null);
    }
  }

return (
    <View style={styles.container}>

      <View style={styles.bleIndicador}>
        <View style={[styles.bleDot, beaconDetectado ? styles.bleDotBeacon : escaneando && styles.bleDotActivo]} />
        <Text style={styles.bleTexto}>
          {beaconDetectado ? 'Barrera detectada — toca el boton para abrir' :
           escaneando ? 'Buscando barrera...' : 'Bluetooth inactivo'}
        </Text>
      </View>

      {cargando ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#2196F3" />
      ) : (
        <FlatList
          data={invitaciones}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} />}
          ListEmptyComponent={
            <View style={styles.vacio}>
              <Text style={styles.vacioTexto}>No tienes invitaciones activas</Text>
              <Text style={styles.vacioSub}>Cuando alguien te invite apareceran aqui</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardEdificio}>{item.edificio_nombre || 'Edificio'}</Text>
                <View style={[styles.presenciaBadge,
                  { backgroundColor: item.presencia === 'dentro' ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.15)' }]}>
                  <Text style={[styles.presenciaTexto,
                    { color: item.presencia === 'dentro' ? '#F59E0B' : '#22C55E' }]}>
                    {item.presencia === 'dentro' ? 'Dentro' : 'Fuera'}
                  </Text>
                </View>
              </View>

              {item.unidad_destino ?
                <Text style={styles.cardUnidad}>Dirigirse a: {item.unidad_destino}</Text> : null}
              <Text style={styles.cardInvitante}>Invitado por: {item.nombre_propietario || item.numero_propietario}</Text>
              <Text style={styles.cardDias}>{diasTexto(item.dias_permitidos)}</Text>
              <Text style={styles.cardHorario}>
                {item.todo_el_dia ? 'Todo el dia' : `${item.hora_inicio} — ${item.hora_fin}`}
              </Text>
              <Text style={styles.cardFecha}>
                Hasta {new Date(item.fecha_hasta).toLocaleDateString('es-CL')}
              </Text>

              <TouchableOpacity
                style={[styles.botonAcceso,
                  item.presencia === 'dentro' && styles.botonSalida,
                  (!beaconDetectado || abriendo === item.id) && styles.botonDisabled]}
                onPress={() => { handleSolicitarAcceso(item); setBeaconDetectado(false); setInvitacionBeacon(null); }}
                disabled={!beaconDetectado || !!abriendo}>
                {abriendo === item.id
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.botonAccesoTexto}>
                      {item.presencia === 'dentro' ? 'Solicitar salida' : 'Solicitar entrada'}
                    </Text>
                }
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#1E3A5F' },
  card:             { borderRadius: 12, padding: 16, marginBottom: 12,
                      borderColor: '#FFFFFF', borderWidth: 0.5 },
  cardHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardEdificio:     { fontSize: 17, fontWeight: '700', color: '#F59E0B' },
  presenciaBadge:   { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  presenciaTexto:   { fontSize: 12, fontWeight: '600' },
  cardUnidad:       { fontSize: 14, color: '#F59E0B', fontWeight: '600', marginBottom: 4 },
  cardInvitante:    { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 2 },
  cardDias:         { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 2 },
  cardHorario:      { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 2 },
  cardFecha:        { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 12 },
  botonAcceso:      { backgroundColor: '#1D9E75', borderRadius: 10, padding: 14, alignItems: 'center' },
  botonSalida:      { backgroundColor: '#F59E0B' },
  botonDisabled:    { opacity: 0.6 },
  botonAccesoTexto: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  bleIndicador:    { flexDirection: 'row', alignItems: 'center', padding: 14,
                     backgroundColor: 'transparent', borderBottomWidth: 0.5,
                     borderBottomColor: 'rgba(255,255,255,0.15)', gap: 10 },
  bleDot:          { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.3)' },
  bleDotActivo:    { backgroundColor: '#F59E0B' },
  bleDotBeacon:    { backgroundColor: '#22C55E' },
  bleTexto:        { fontSize: 13, color: 'rgba(255,255,255,0.7)', flex: 1 },
  vacio:            { alignItems: 'center', marginTop: 60, padding: 32 },
  vacioTexto:       { fontSize: 16, color: 'rgba(255,255,255,0.4)', fontWeight: '600', marginBottom: 8 },
  vacioSub:         { fontSize: 14, color: 'rgba(255,255,255,0.3)', textAlign: 'center' },
});
