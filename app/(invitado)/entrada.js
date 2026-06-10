// ============================================================
//  app/(invitado)/entrada.js — Pantalla principal del invitado
//  Beacon por header + GPS fallback
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, FlatList, Alert } from 'react-native';
import * as Location from 'expo-location';
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
const GPS_TIMEOUT_SEGUNDOS = 20;

function diasTexto(dias) {
  if (dias === '1234567') return 'Todos los dias';
  if (dias === '12345')   return 'Dias laborales';
  if (dias === '67')      return 'Fin de semana';
  return dias.split('').map(d => DIAS_LABELS[d]).join(', ');
}

function calcularDistancia(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(deltaPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function Entrada() {
  const { usuario, cerrarSesion } = useAuth();
  const [invitaciones, setInvitaciones] = useState([]);
  const [estado, setEstado] = useState(ESTADO.BUSCANDO);
  const [resultado, setResultado] = useState(null);
  const [mensajeError, setMensajeError] = useState('');
  const [abriendo, setAbriendo] = useState(null);
  const [beaconDetectado, setBeaconDetectado] = useState(false);
  const [invitacionBeacon, setInvitacionBeacon] = useState(null);
  const [modoGPS, setModoGPS] = useState(false);
  const [gpsDisponible, setGpsDisponible] = useState(false);
  const [ubicacionUsuario, setUbicacionUsuario] = useState(null);
  const [obteniendoGPS, setObteniendoGPS] = useState(false);
  const gpsTimerRef = useRef(null);

  // Extraer headers (uuid_ble) de las invitaciones para useBLE
  const headersBD = invitaciones
    .map(inv => inv.uuid_ble)
    .filter(Boolean);

  const { escaneando, headerDetectado } = useBLE(headersBD, handleBeaconDetectado);

  // FIX: Sincronizar estado beaconDetectado con headerDetectado de useBLE
  useEffect(() => {
    if (headerDetectado) {
      const inv = invitaciones.find(i => i.uuid_ble?.toLowerCase() === headerDetectado.toLowerCase());
      if (inv) {
        setBeaconDetectado(true);
        setInvitacionBeacon(inv);
        // Si beacon vuelve, cancelar modo GPS
        setModoGPS(false);
        setGpsDisponible(false);
        setUbicacionUsuario(null);
      }
    } else {
      // Beacon perdido
      setBeaconDetectado(false);
      setInvitacionBeacon(null);
    }
  }, [headerDetectado]);

  useEffect(() => {
    cargarInvitaciones();
  }, []);

// Timer para GPS fallback
  useEffect(() => {
    console.log('[GPS] Timer check - beaconDetectado:', beaconDetectado, 'invitaciones:', invitaciones.length);
    if (!beaconDetectado && invitaciones.length > 0) {
      console.log('[GPS] Iniciando timer de', GPS_TIMEOUT_SEGUNDOS, 'segundos');
      gpsTimerRef.current = setTimeout(() => {
        const tieneGPS = invitaciones.some(inv => inv.puerta_lat && inv.puerta_lng);
        console.log('[GPS] Timer disparado - tieneGPS:', tieneGPS, 'beaconDetectado:', beaconDetectado);
        if (tieneGPS && !beaconDetectado) {
          console.log('[GPS] Activando modo GPS');
          setModoGPS(true);
        }
      }, GPS_TIMEOUT_SEGUNDOS * 1000);
    }

    return () => {
      if (gpsTimerRef.current) clearTimeout(gpsTimerRef.current);
    };
  }, [beaconDetectado, invitaciones]);

  useEffect(() => {
    if (estado === ESTADO.ENTRADA || estado === ESTADO.SALIDA || estado === ESTADO.ERROR) {
      const t = setTimeout(() => {
        setEstado(ESTADO.BUSCANDO);
        setModoGPS(false);
        setGpsDisponible(false);
        setUbicacionUsuario(null);
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [estado]);

  async function cargarInvitaciones() {
    try {
      const data = await api.invitacionesActivas();
      setInvitaciones(data);
    } catch (e) {
      console.log('Error cargando invitaciones:', e.message);
      setTimeout(() => {
        cargarInvitaciones();
      }, 1500);
    }
  }

  function handleBeaconDetectado(header) {
    if (estado === ESTADO.ABRIENDO) return;
    // La sincronización ahora se hace en el useEffect de headerDetectado
  }

  async function obtenerUbicacion() {
    setObteniendoGPS(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitamos acceso a tu ubicación para verificar proximidad.');
        setObteniendoGPS(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setUbicacionUsuario({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
      setGpsDisponible(true);
    } catch (e) {
      Alert.alert('Error', 'No se pudo obtener tu ubicación.');
      console.log('Error GPS:', e.message);
    } finally {
      setObteniendoGPS(false);
    }
  }

  function estaEnRango(inv) {
    if (!ubicacionUsuario || !inv.puerta_lat || !inv.puerta_lng) return false;
    const distancia = calcularDistancia(
      ubicacionUsuario.lat, ubicacionUsuario.lng,
      inv.puerta_lat, inv.puerta_lng
    );
    const radio = inv.puerta_radio || 50;
    return distancia <= radio;
  }

  async function handleBotonManual(inv) {
    if (estado === ESTADO.ABRIENDO) return;

    if (beaconDetectado) {
      // Modo beacon: validar que el header coincida
      if (!invitacionBeacon || inv.uuid_ble?.toLowerCase() !== invitacionBeacon.uuid_ble?.toLowerCase()) {
        Alert.alert('Error', 'No estás frente a la puerta correcta para esta invitación.');
        return;
      }
      await solicitarAcceso(inv.uuid_ble, inv.id, null, null);
    } else if (gpsDisponible && ubicacionUsuario) {
      // Modo GPS: validar que esté en rango
      if (!estaEnRango(inv)) {
        Alert.alert('Fuera de rango', 'No estás lo suficientemente cerca de la puerta.');
        return;
      }
      await solicitarAcceso(null, inv.id, ubicacionUsuario.lat, ubicacionUsuario.lng);
    }

    setAbriendo(null);
    setBeaconDetectado(false);
    setInvitacionBeacon(null);
    setGpsDisponible(false);
    setUbicacionUsuario(null);
    setModoGPS(false);
  }

  async function solicitarAcceso(uuid_ble, invitacion_id, lat, lng) {
    setEstado(ESTADO.ABRIENDO);
    try {
      const data = await api.solicitarAcceso(uuid_ble, invitacion_id, lat, lng);
      setResultado(data);
      setEstado(data.accion === 'entrada' ? ESTADO.ENTRADA : ESTADO.SALIDA);
      cargarInvitaciones();
    } catch (e) {
      setMensajeError(e.message || 'No se pudo abrir la barrera.');
      setEstado(ESTADO.ERROR);
    }
  }

  // ---- Pantallas de resultado ----

  if (estado === ESTADO.ABRIENDO) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1E3A5F' }}>
        <ActivityIndicator size="large" color="#F59E0B" />
        <Text style={styles.estadoTexto}>Abriendo barrera...</Text>
      </View>
    );
  }

  if (estado === ESTADO.ENTRADA) {
    return (
      <View style={[styles.container, styles.centrado]}>
        <View style={[styles.icono, { backgroundColor: '#22C55E' }]}>
          <Text style={styles.iconoTexto}>↑</Text>
        </View>
        <Text style={styles.resultadoTitulo}>Barrera abierta</Text>
        <Text style={styles.resultadoSub}>Bienvenido — ingreso registrado</Text>
      </View>
    );
  }

  if (estado === ESTADO.SALIDA) {
    return (
      <View style={[styles.container, styles.centrado]}>
        <View style={[styles.icono, { backgroundColor: '#F59E0B' }]}>
          <Text style={styles.iconoTexto}>↓</Text>
        </View>
        <Text style={styles.resultadoTitulo}>Hasta pronto</Text>
        <Text style={styles.resultadoSub}>Salida registrada</Text>
      </View>
    );
  }

  if (estado === ESTADO.ERROR) {
    return (
      <View style={[styles.container, styles.centrado]}>
        <View style={[styles.icono, { backgroundColor: '#E24B4A' }]}>
          <Text style={styles.iconoTexto}>✕</Text>
        </View>
        <Text style={[styles.resultadoTitulo, { color: '#EF4444' }]}>Acceso denegado</Text>
        <Text style={styles.resultadoSub}>{mensajeError}</Text>
      </View>
    );
  }

  // ---- Pantalla principal BUSCANDO ----
  const botonHabilitado = beaconDetectado || (gpsDisponible && ubicacionUsuario);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Mis invitaciones</Text>
        <TouchableOpacity onPress={cerrarSesion}>
          <Text style={styles.cerrarSesion}>Salir</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bleIndicador}>
        {(() => {
          const algunaEnRango = gpsDisponible && ubicacionUsuario && invitaciones.some(inv => estaEnRango(inv));
          return (
            <>
              <View style={[styles.bleDot,
                beaconDetectado ? styles.bleDotBeacon :
                algunaEnRango ? styles.bleDotGPS :
                escaneando && styles.bleDotActivo
              ]} />
              <Text style={styles.bleTexto}>
                {beaconDetectado ? 'Barrera detectada — toca el boton para abrir' :
                 algunaEnRango ? 'Ubicación verificada — toca el boton para abrir' :
                 gpsDisponible ? 'Fuera del rango de la puerta' :
                 modoGPS ? 'Beacon no detectado — usa tu ubicación' :
                 escaneando ? 'Buscando barrera...' : 'Bluetooth inactivo'}
              </Text>
            </>
          );
        })()}
      </View>

      {modoGPS && !gpsDisponible && !beaconDetectado && (
        <TouchableOpacity
          style={styles.botonGPS}
          onPress={obtenerUbicacion}
          disabled={obteniendoGPS}>
          {obteniendoGPS
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.botonGPSTexto}>Verificar mi ubicación</Text>
          }
        </TouchableOpacity>
      )}

      {invitaciones.length === 0 ? (
        <View style={styles.centrado}>
          <Text style={styles.vacio}>No tienes invitaciones activas para hoy</Text>
        </View>
      ) : (
        <FlatList
          data={invitaciones}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => {
            const enRango = gpsDisponible && ubicacionUsuario && estaEnRango(item);
            const puedeAbrir = beaconDetectado || enRango;

            return (
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
                {item.unidad_destino ? (
                  <Text style={styles.cardUnidad}>Dirigirse a: {item.unidad_destino}</Text>
                ) : null}
                <Text style={styles.cardFecha}>
                  Hasta {new Date(item.fecha_hasta).toLocaleDateString('es-CL')}
                </Text>

                {gpsDisponible && ubicacionUsuario && !beaconDetectado && (
                  <Text style={[styles.cardModo, { color: enRango ? '#22C55E' : '#EF4444' }]}>
                    {enRango ? '📍 Dentro del rango GPS' : '📍 Fuera del rango GPS'}
                  </Text>
                )}

                <TouchableOpacity
                  style={[styles.botonAcceso,
                    item.presencia === 'dentro' && styles.botonSalida,
                    (!puedeAbrir || abriendo === item.id) && styles.botonDisabled]}
                  onPress={() => handleBotonManual(item)}
                  disabled={!puedeAbrir || !!abriendo}>
                  <Text style={styles.botonAccesoTexto}>
                    {item.presencia === 'dentro' ? 'Solicitar salida' : 'Solicitar entrada'}
                  </Text>
                </TouchableOpacity>

              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#1E3A5F' },
  centrado:        { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                     padding: 20, paddingTop: 50, backgroundColor: '#1E3A5F' },
  titulo:          { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  cerrarSesion:    { color: 'rgba(255,255,255,0.85)', fontSize: 14 },
  bleIndicador:    { flexDirection: 'row', alignItems: 'center', padding: 14,
                     backgroundColor: '#1E3A5F', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.15)', gap: 10 },
  bleDot:          { width: 10, height: 10, borderRadius: 5, backgroundColor: '#CCC' },
  bleDotActivo:    { backgroundColor: '#F59E0B' },
  bleDotBeacon:    { backgroundColor: '#22C55E' },
  bleDotGPS:       { backgroundColor: '#2196F3' },
  bleTexto:        { fontSize: 13, color: 'rgba(255,255,255,0.85)', flex: 1 },
  botonGPS:        { backgroundColor: '#2196F3', margin: 16, padding: 14, borderRadius: 12, alignItems: 'center' },
  botonGPSTexto:   { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  card:            { borderRadius: 12, padding: 16, marginBottom: 12,
                     borderColor: '#FFFFFF', borderWidth: 0.5 },
  cardHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardPuerta:      { fontSize: 17, fontWeight: '700', color: '#F59E0B' },
  presenciaBadge:  { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  presenciaTexto:  { fontSize: 12, fontWeight: '600' },
  cardDias:        { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 2 },
  cardHorario:     { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 2 },
  cardFecha:       { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 12 },
  cardUnidad:      { fontSize: 14, color: '#F59E0B', fontWeight: '600', marginBottom: 4 },
  cardModo:        { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  botonAcceso:     { backgroundColor: '#1D9E75', borderRadius: 10, padding: 14, alignItems: 'center' },
  botonSalida:     { backgroundColor: '#F59E0B' },
  botonDisabled:   { opacity: 0.4 },
  botonAccesoTexto:{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  icono:           { width: 90, height: 90, borderRadius: 45,
                     justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  iconoTexto:      { fontSize: 40, color: '#FFFFFF', fontWeight: '700' },
  estadoTexto:     { fontSize: 18, color: 'rgba(255,255,255,0.85)', marginTop: 20 },
  resultadoTitulo: { fontSize: 28, fontWeight: '700', color: '#22C55E', marginBottom: 8 },
  resultadoSub:    { fontSize: 15, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
  vacio:           { fontSize: 15, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 22 },
});
