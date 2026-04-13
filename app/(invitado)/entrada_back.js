// ============================================================
//  app/(invitado)/entrada.js — Pantalla principal del invitado
//  Beacon unico — el backend decide entrada o salida segun presencia
// ============================================================

import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { useBLE } from '../../hooks/useBLE';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

const ESTADO = {
  BUSCANDO: 'buscando',
  ABRIENDO: 'abriendo',
  ENTRADA:  'entrada',
  SALIDA:   'salida',
  ERROR:    'error',
};

const DIAS_LABELS = { '1':'Lun','2':'Mar','3':'Mie','4':'Jue','5':'Vie','6':'Sab','7':'Dom' };

function diasTexto(dias) {
  if (dias === '1234567') return 'Todos los dias';
  if (dias === '12345')   return 'Dias laborales';
  if (dias === '67')      return 'Fin de semana';
  return dias.split('').map(d => DIAS_LABELS[d]).join(', ');
}

export default function Entrada() {
  const { usuario, cerrarSesion } = useAuth();
  const [invitaciones, setInvitaciones] = useState([]);
  const [estado, setEstado] = useState(ESTADO.BUSCANDO);
  const [resultado, setResultado] = useState(null);
  const [mensajeError, setMensajeError] = useState('');

  const uuidsBeacon = invitaciones
    .map(inv => inv.uuid_ble)
    .filter(Boolean);

  const { escaneando } = useBLE(uuidsBeacon, handleBeaconDetectado);

  useEffect(() => { cargarInvitaciones(); }, []);

  useEffect(() => {
    if (estado === ESTADO.ENTRADA || estado === ESTADO.SALIDA || estado === ESTADO.ERROR) {
      const t = setTimeout(() => setEstado(ESTADO.BUSCANDO), 5000);
      return () => clearTimeout(t);
    }
  }, [estado]);

  async function cargarInvitaciones() {
    try {
      const data = await api.invitacionesActivas();
      setInvitaciones(data);
    } catch (e) {
      console.log('Error cargando invitaciones:', e.message);
    }
  }

  async function handleBeaconDetectado(uuid_ble) {
    if (estado === ESTADO.ABRIENDO) return;
    const inv = invitaciones.find(i => i.uuid_ble?.toLowerCase() === uuid_ble.toLowerCase());
    await solicitarAcceso(uuid_ble, inv?.id);
  }

  async function handleBotonManual(inv) {
    if (estado === ESTADO.ABRIENDO) return;
    await solicitarAcceso(inv.uuid_ble, inv.id);
  }

  async function solicitarAcceso(uuid_ble, invitacion_id) {
    setEstado(ESTADO.ABRIENDO);
    try {
      const data = await api.solicitarAcceso(uuid_ble, invitacion_id);
      setResultado(data);
      setEstado(data.accion === 'entrada' ? ESTADO.ENTRADA : ESTADO.SALIDA);
      // Recargar para actualizar estado de presencia
      cargarInvitaciones();
    } catch (e) {
      setMensajeError(e.message || 'No se pudo abrir la barrera.');
      setEstado(ESTADO.ERROR);
    }
  }

  // ---- Pantallas de resultado ----

  if (estado === ESTADO.ABRIENDO) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#2E4A7A" />
        <Text style={styles.estadoTexto}>Abriendo barrera...</Text>
      </View>
    );
  }

  if (estado === ESTADO.ENTRADA) {
    return (
      <View style={styles.centrado}>
        <View style={[styles.icono, { backgroundColor: '#1D9E75' }]}>
          <Text style={styles.iconoTexto}>↑</Text>
        </View>
        <Text style={styles.resultadoTitulo}>Barrera abierta</Text>
        <Text style={styles.resultadoSub}>Bienvenido — ingreso registrado</Text>
      </View>
    );
  }

  if (estado === ESTADO.SALIDA) {
    return (
      <View style={styles.centrado}>
        <View style={[styles.icono, { backgroundColor: '#185FA5' }]}>
          <Text style={styles.iconoTexto}>↓</Text>
        </View>
        <Text style={styles.resultadoTitulo}>Hasta pronto</Text>
        <Text style={styles.resultadoSub}>Salida registrada</Text>
      </View>
    );
  }

  if (estado === ESTADO.ERROR) {
    return (
      <View style={styles.centrado}>
        <View style={[styles.icono, { backgroundColor: '#E24B4A' }]}>
          <Text style={styles.iconoTexto}>✕</Text>
        </View>
        <Text style={[styles.resultadoTitulo, { color: '#A32D2D' }]}>Acceso denegado</Text>
        <Text style={styles.resultadoSub}>{mensajeError}</Text>
      </View>
    );
  }

  // ---- Pantalla principal BUSCANDO ----
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Mis invitaciones</Text>
        <TouchableOpacity onPress={cerrarSesion}>
          <Text style={styles.cerrarSesion}>Salir</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bleIndicador}>
        <View style={[styles.bleDot, escaneando && styles.bleDotActivo]} />
        <Text style={styles.bleTexto}>
          {escaneando ? 'Acercate a la barrera — la app abre automaticamente' : 'Bluetooth inactivo'}
        </Text>
      </View>

      {invitaciones.length === 0 ? (
        <View style={styles.centrado}>
          <Text style={styles.vacio}>No tienes invitaciones activas para hoy</Text>
        </View>
      ) : (
        <FlatList
          data={invitaciones}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={styles.card}>

              <View style={styles.cardHeader}>
                <Text style={styles.cardPuerta}>{item.puerta_nombre}</Text>
                <View style={[styles.presenciaBadge,
                  { backgroundColor: item.presencia === 'dentro' ? '#E3F2FD' : '#E8F5E9' }]}>
                  <Text style={[styles.presenciaTexto,
                    { color: item.presencia === 'dentro' ? '#185FA5' : '#1D6A4A' }]}>
                    {item.presencia === 'dentro' ? 'Dentro' : 'Fuera'}
                  </Text>
                </View>
              </View>

              <Text style={styles.cardDias}>{diasTexto(item.dias_permitidos)}</Text>
              <Text style={styles.cardHorario}>
                {item.todo_el_dia ? 'Todo el dia' : `${item.hora_inicio} — ${item.hora_fin}`}
              </Text>
              <Text style={styles.cardFecha}>
                Hasta {new Date(item.fecha_hasta).toLocaleDateString('es-CL')}
              </Text>

              <TouchableOpacity
                style={[styles.botonAcceso,
                  item.presencia === 'dentro' && styles.botonSalida]}
                onPress={() => handleBotonManual(item)}>
                <Text style={styles.botonAccesoTexto}>
                  {item.presencia === 'dentro' ? 'Solicitar salida' : 'Solicitar entrada'}
                </Text>
              </TouchableOpacity>

            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#F8F8F8' },
  centrado:        { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                     paddingTop: 50, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#2E4A7A' },
  titulo:          { fontSize: 20, fontWeight: '700', color: '#fff' },
  cerrarSesion:    { color: '#AAD4FF', fontSize: 14 },
  bleIndicador:    { flexDirection: 'row', alignItems: 'center', padding: 14,
                     backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EEE', gap: 10 },
  bleDot:          { width: 10, height: 10, borderRadius: 5, backgroundColor: '#CCC' },
  bleDotActivo:    { backgroundColor: '#1D9E75' },
  bleTexto:        { fontSize: 13, color: '#555', flex: 1 },
  card:            { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
                     shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardPuerta:      { fontSize: 17, fontWeight: '700', color: '#2E4A7A' },
  presenciaBadge:  { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  presenciaTexto:  { fontSize: 12, fontWeight: '600' },
  cardDias:        { fontSize: 13, color: '#555', marginBottom: 2 },
  cardHorario:     { fontSize: 13, color: '#555', marginBottom: 2 },
  cardFecha:       { fontSize: 13, color: '#888', marginBottom: 12 },
  botonAcceso:     { backgroundColor: '#2E4A7A', borderRadius: 10, padding: 14, alignItems: 'center' },
  botonSalida:     { backgroundColor: '#185FA5' },
  botonAccesoTexto:{ color: '#fff', fontSize: 14, fontWeight: '600' },
  icono:           { width: 90, height: 90, borderRadius: 45,
                     justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  iconoTexto:      { fontSize: 40, color: '#fff', fontWeight: '700' },
  estadoTexto:     { fontSize: 18, color: '#555', marginTop: 20 },
  resultadoTitulo: { fontSize: 28, fontWeight: '700', color: '#1D6A4A', marginBottom: 8 },
  resultadoSub:    { fontSize: 15, color: '#666', textAlign: 'center' },
  vacio:           { fontSize: 15, color: '#AAA', textAlign: 'center', lineHeight: 22 },
});
