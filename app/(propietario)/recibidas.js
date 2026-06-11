// ============================================================
//  app/(propietario)/recibidas.js — Invitaciones recibidas
//  Invitaciones donde el propietario es el invitado
//  Beacon por header + GPS fallback
// ============================================================

import { useState, useCallback, useEffect, useRef } from 'react';
import { useBLE } from '../../hooks/useBLE';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, RefreshControl
} from 'react-native';
import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { api } from '../../services/api';

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

export default function Recibidas() {
  const [invitaciones, setInvitaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [abriendo, setAbriendo] = useState(null);
  const [beaconDetectado, setBeaconDetectado] = useState(false);
  const [invitacionBeacon, setInvitacionBeacon] = useState(null);
  const [modoGPS, setModoGPS] = useState(false);
  const [gpsDisponible, setGpsDisponible] = useState(false);
  const [ubicacionUsuario, setUbicacionUsuario] = useState(null);
  const [obteniendoGPS, setObteniendoGPS] = useState(false);
  const gpsTimerRef = useRef(null);

  useFocusEffect(useCallback(() => { cargar(); }, []));

  const headersBD = invitaciones.map(inv => inv.uuid_ble).filter(Boolean);

  const { escaneando, headerDetectado } = useBLE(headersBD, () => {});

  // FIX: Sincronizar estado beaconDetectado con headerDetectado de useBLE
  useEffect(() => {
    if (headerDetectado) {
      const inv = invitaciones.find(i => i.uuid_ble?.toLowerCase() === headerDetectado.toLowerCase());
      if (inv) {
        setBeaconDetectado(true);
        setInvitacionBeacon(inv);
        setModoGPS(false);
        setGpsDisponible(false);
        setUbicacionUsuario(null);
      }
    } else {
      setBeaconDetectado(false);
      setInvitacionBeacon(null);
    }
  }, [headerDetectado]);

  // Timer para GPS fallback
  useEffect(() => {
    if (!beaconDetectado && invitaciones.length > 0) {
      gpsTimerRef.current = setTimeout(() => {
        const tieneGPS = invitaciones.some(inv => inv.puerta_lat && inv.puerta_lng);
        if (tieneGPS && !beaconDetectado) {
          setModoGPS(true);
        }
      }, GPS_TIMEOUT_SEGUNDOS * 1000);
    }

    return () => {
      if (gpsTimerRef.current) clearTimeout(gpsTimerRef.current);
    };
  }, [beaconDetectado, invitaciones]);

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

  async function handleSolicitarAcceso(inv) {
    if (abriendo) return;

    if (beaconDetectado) {
      if (!invitacionBeacon || inv.uuid_ble?.toLowerCase() !== invitacionBeacon.uuid_ble?.toLowerCase()) {
        Alert.alert('Error', 'No estás frente a la puerta correcta para esta invitación.');
        return;
      }
      setAbriendo(inv.id);
      try {
        const data = await api.solicitarAcceso(inv.uuid_ble, inv.id, null, null);
        const esEntrada = data.accion === 'entrada';
        Alert.alert(
          esEntrada ? 'Barrera abierta' : 'Hasta pronto',
          esEntrada ? 'Ingreso registrado' : 'Salida registrada'
        );
        cargar();
      } catch (e) {
        Alert.alert('Acceso denegado', e.message);
      } finally {
        setAbriendo(null);
        setBeaconDetectado(false);
        setInvitacionBeacon(null);
      }
    } else if (gpsDisponible && ubicacionUsuario) {
      if (!estaEnRango(inv)) {
        Alert.alert('Fuera de rango', 'No estás lo suficientemente cerca de la puerta.');
        return;
      }
      setAbriendo(inv.id);
      try {
        const data = await api.solicitarAcceso(null, inv.id, ubicacionUsuario.lat, ubicacionUsuario.lng);
        const esEntrada = data.accion === 'entrada';
        Alert.alert(
          esEntrada ? 'Barrera abierta' : 'Hasta pronto',
          esEntrada ? 'Ingreso registrado' : 'Salida registrada'
        );
        cargar();
      } catch (e) {
        Alert.alert('Acceso denegado', e.message);
      } finally {
        setAbriendo(null);
        setGpsDisponible(false);
        setUbicacionUsuario(null);
        setModoGPS(false);
      }
    }
  }

  return (
    <View style={styles.container}>

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
          renderItem={({ item }) => {
            const enRango = gpsDisponible && ubicacionUsuario && estaEnRango(item);
            const puedeAbrir = beaconDetectado || enRango;

            return (
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

                {gpsDisponible && ubicacionUsuario && !beaconDetectado && (
                  <Text style={[styles.cardModo, { color: enRango ? '#22C55E' : '#EF4444' }]}>
                    {enRango ? '📍 Dentro del rango GPS' : '📍 Fuera del rango GPS'}
                  </Text>
                )}

                <TouchableOpacity
                  style={[styles.botonAcceso,
                    item.presencia === 'dentro' && styles.botonSalida,
                    (!puedeAbrir || abriendo === item.id) && styles.botonDisabled]}
                  onPress={() => handleSolicitarAcceso(item)}
                  disabled={!puedeAbrir || !!abriendo}>
                  {abriendo === item.id
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.botonAccesoTexto}>
                        {item.presencia === 'dentro' ? 'Solicitar salida' : 'Solicitar entrada'}
                      </Text>
                  }
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
  cardModo:         { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  botonAcceso:      { backgroundColor: '#1D9E75', borderRadius: 10, padding: 14, alignItems: 'center' },
  botonSalida:      { backgroundColor: '#F59E0B' },
  botonDisabled:    { opacity: 0.4 },
  botonAccesoTexto: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  bleIndicador:     { flexDirection: 'row', alignItems: 'center', padding: 14,
                      backgroundColor: 'transparent', borderBottomWidth: 0.5,
                      borderBottomColor: 'rgba(255,255,255,0.15)', gap: 10 },
  bleDot:           { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.3)' },
  bleDotActivo:     { backgroundColor: '#F59E0B' },
  bleDotBeacon:     { backgroundColor: '#22C55E' },
  bleDotGPS:        { backgroundColor: '#2196F3' },
  bleTexto:         { fontSize: 13, color: 'rgba(255,255,255,0.7)', flex: 1 },
  botonGPS:         { backgroundColor: '#2196F3', margin: 16, padding: 14, borderRadius: 12, alignItems: 'center' },
  botonGPSTexto:    { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  vacio:            { alignItems: 'center', marginTop: 60, padding: 32 },
  vacioTexto:       { fontSize: 16, color: 'rgba(255,255,255,0.4)', fontWeight: '600', marginBottom: 8 },
  vacioSub:         { fontSize: 14, color: 'rgba(255,255,255,0.3)', textAlign: 'center' },
});
