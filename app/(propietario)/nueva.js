// ============================================================
//  app/(propietario)/nueva.js — Crear nueva invitacion
//  Con selector de fecha/hora nativo via modal-datetime-picker
// ============================================================

import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, Switch, Linking
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { router } from 'expo-router';
import * as Contacts from 'expo-contacts';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';

const DIAS = [
  { num: '1', label: 'L' },
  { num: '2', label: 'M' },
  { num: '3', label: 'X' },
  { num: '4', label: 'J' },
  { num: '5', label: 'V' },
  { num: '6', label: 'S' },
  { num: '7', label: 'D' },
];

const PRESETS_DIAS = [
  { label: 'Todos los dias', valor: '1234567' },
  { label: 'Solo laborales', valor: '12345' },
  { label: 'Fin de semana', valor: '67' },
];

export default function NuevaVisita() {
  const [numero, setNumero] = useState('');
  const [puertaId, setPuertaId] = useState('');
  const [puertas, setPuertas] = useState([]);
  const [fechaDesde, setFechaDesde] = useState(new Date());
  const [fechaHasta, setFechaHasta] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const [todoElDia, setTodoElDia] = useState(false);
  const [horaInicio, setHoraInicio] = useState('08:00');
  const [horaFin, setHoraFin] = useState('20:00');
  const [diasSeleccionados, setDiasSeleccionados] = useState('1234567');
  const [nota, setNota] = useState('');
  const [unidadDestino, setUnidadDestino] = useState('');
  const [notaContacto, setNotaContacto] = useState('');
  const { usuario } = useAuth();
  const [cargando, setCargando] = useState(false);

  // Control del modal de fecha
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState('date');
  const [pickerTarget, setPickerTarget] = useState('desde'); // 'desde' | 'hasta'

  useEffect(() => { cargarPuertas(); }, []);

  async function seleccionarContacto() {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitamos acceso a tus contactos para esta funcion.');
        return;
      }
      const resultado = await Contacts.presentContactPickerAsync();
      if (resultado && resultado.phoneNumbers && resultado.phoneNumbers.length > 0) {
        const tel = resultado.phoneNumbers[0].number.replace(/\s|-/g, '');
        setNumero(tel);
        if (resultado.name) {
          // Guardar nombre para mostrarlo como referencia
          setNotaContacto(resultado.name);
        }
      }
    } catch (e) {
      console.log('Error accediendo contactos:', e.message);
    }
  }

  async function cargarPuertas() {
    try {
      const data = await api.listarPuertas();
      const entradas = data.filter(p => p.uuid_ble);
      setPuertas(entradas);
      if (entradas.length > 0) setPuertaId(entradas[0].id);
    } catch (e) {
      Alert.alert('Error', 'No se pudieron cargar las puertas.');
    }
  }

  function abrirPicker(target, mode) {
    setPickerTarget(target);
    setPickerMode(mode);
    setPickerVisible(true);
  }

  function handleConfirm(date) {
    setPickerVisible(false);
    if (pickerTarget === 'desde') {
      setFechaDesde(date);
    } else {
      setFechaHasta(date);
    }
  }

  function toggleDia(num) {
    setDiasSeleccionados(prev => {
      const tiene = prev.includes(num);
      const nuevo = tiene
        ? prev.split('').filter(d => d !== num).sort().join('')
        : [...prev.split(''), num].sort().join('');
      return nuevo || prev;
    });
  }

  const formatFecha = d => d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const formatHora  = d => d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });

  async function handleCrear() {
    const numeroLimpio = numero.trim();
    if (numeroLimpio.length < 9) {
      Alert.alert('Error', 'Ingresa el numero de celular del invitado.');
      return;
    }
    if (!puertaId) {
      Alert.alert('Error', 'Selecciona una barrera de acceso.');
      return;
    }
    if (fechaHasta <= fechaDesde) {
      Alert.alert('Error', 'La fecha de termino debe ser posterior a la de inicio.');
      return;
    }
    if (diasSeleccionados.length === 0) {
      Alert.alert('Error', 'Selecciona al menos un dia permitido.');
      return;
    }

    const numeroFormateado = numeroLimpio.startsWith('+')
      ? numeroLimpio
      : `+56${numeroLimpio.replace(/^0/, '')}`;

    setCargando(true);
    try {
      await api.crearInvitacion({
        membresia_id: usuario.membresia_id,
        numero_invitado: numeroFormateado,
        puerta_id: puertaId,
        unidad_destino: unidadDestino.trim() || null,
        fecha_desde: fechaDesde.toISOString(),
        fecha_hasta: fechaHasta.toISOString(),
        todo_el_dia: todoElDia,
        hora_inicio: todoElDia ? '00:00' : horaInicio,
        hora_fin:    todoElDia ? '23:59' : horaFin,
        dias_permitidos: diasSeleccionados,
        nota: nota.trim() || null,
      });

      const fechaHastaTexto = fechaHasta.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const mensajeWA = `Hola, te he invitado a ${unidadDestino || 'mi domicilio'}. Tu acceso está habilitado hasta el ${fechaHastaTexto}. Descarga la app AppAcceso para ingresar.`;
      const numeroWA = numeroFormateado.replace('+', '');

      Alert.alert('Invitación creada', `Invitación para ${numeroFormateado} creada correctamente.\n\n¿Deseas notificar al invitado?`, [
        { text: 'No', onPress: () => router.replace('/(propietario)/visitas') },
        { text: 'Notificar', onPress: async () => {
          try {
            await Linking.openURL(`https://wa.me/${numeroWA}?text=${encodeURIComponent(mensajeWA)}`);
          } catch {
            await Linking.openURL(`sms:${numeroFormateado}?body=${encodeURIComponent(mensajeWA)}`).catch(() => {});
          }
          router.replace('/(propietario)/visitas');
        }},
      ]);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Numero de celular del invitado</Text>
      <View style={styles.inputRow}>
        <TextInput style={[styles.input, { flex: 1 }]} placeholder="+56 9 1234 5678"
          placeholderTextColor="rgba(229,231,235,0.5)" keyboardType="phone-pad"
          value={numero} onChangeText={v => { setNumero(v); setNotaContacto(''); }} />
        <TouchableOpacity style={styles.btnAgenda} onPress={seleccionarContacto}>
          <Text style={styles.btnAgendaTexto}>Agenda</Text>
        </TouchableOpacity>
      </View>
      {notaContacto ? <Text style={styles.contactoNombre}>{notaContacto}</Text> : null}

      <Text style={styles.label}>Barrera de acceso</Text>
      <View style={styles.puertas}>
        {puertas.map(p => (
          <TouchableOpacity key={p.id}
            style={[styles.puertaBtn, puertaId === p.id && styles.puertaBtnActivo]}
            onPress={() => setPuertaId(p.id)}>
            <Text style={[styles.puertaTexto, puertaId === p.id && styles.puertaTextoActivo]}>
              {p.nombre}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Periodo valido</Text>

      {/* Fecha desde */}
      <View style={styles.fechaRow}>
        <TouchableOpacity style={[styles.fechaBtn, { flex: 2 }]}
          onPress={() => abrirPicker('desde', 'date')}>
          <Text style={styles.fechaLabel}>Desde</Text>
          <Text style={styles.fechaValor}>{formatFecha(fechaDesde)}</Text>
        </TouchableOpacity>
      </View>

      {/* Fecha hasta */}
      <View style={styles.fechaRow}>
        <TouchableOpacity style={[styles.fechaBtn, { flex: 2 }]}
          onPress={() => abrirPicker('hasta', 'date')}>
          <Text style={styles.fechaLabel}>Hasta</Text>
          <Text style={styles.fechaValor}>{formatFecha(fechaHasta)}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Dias permitidos</Text>
      <View style={styles.presetsRow}>
        {PRESETS_DIAS.map(p => (
          <TouchableOpacity key={p.valor}
            style={[styles.presetBtn, diasSeleccionados === p.valor && styles.presetBtnActivo]}
            onPress={() => setDiasSeleccionados(p.valor)}>
            <Text style={[styles.presetTexto, diasSeleccionados === p.valor && styles.presetTextoActivo]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.diasRow}>
        {DIAS.map(d => (
          <TouchableOpacity key={d.num}
            style={[styles.diaBtn, diasSeleccionados.includes(d.num) && styles.diaBtnActivo]}
            onPress={() => toggleDia(d.num)}>
            <Text style={[styles.diaTexto, diasSeleccionados.includes(d.num) && styles.diaTextoActivo]}>
              {d.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.label}>Todo el dia</Text>
        <Switch value={todoElDia} onValueChange={setTodoElDia}
          trackColor={{ true: '#2E4A7A' }} thumbColor="#fff" />
      </View>

      {!todoElDia && (
        <View style={styles.horasRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.labelSmall}>Hora inicio</Text>
            <TextInput style={styles.inputHora} placeholder="08:00"
              placeholderTextColor="rgba(229,231,235,0.5)" value={horaInicio}
              onChangeText={setHoraInicio} keyboardType="numbers-and-punctuation" />
          </View>
          <View style={{ width: 16 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.labelSmall}>Hora fin</Text>
            <TextInput style={styles.inputHora} placeholder="20:00"
              placeholderTextColor="rgba(229,231,235,0.5)" value={horaFin}
              onChangeText={setHoraFin} keyboardType="numbers-and-punctuation" />
          </View>
        </View>
      )}

      <Text style={styles.label}>Unidad de destino</Text>
      <TextInput style={styles.input}
        placeholder="Ej: Depto 301 Torre A"
        placeholderTextColor="rgba(229,231,235,0.5)" value={unidadDestino}
        onChangeText={setUnidadDestino} />

      <Text style={styles.label}>Nota (opcional)</Text>
      <TextInput style={[styles.input, styles.inputNota]}
        placeholder="Ej: Proveedor de mantencion"
        placeholderTextColor="rgba(229,231,235,0.5)" value={nota} onChangeText={setNota}
        multiline numberOfLines={3} />

      <TouchableOpacity
        style={[styles.boton, cargando && styles.botonDisabled]}
        onPress={handleCrear} disabled={cargando}>
        {cargando
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.botonTexto}>Crear invitacion</Text>
        }
      </TouchableOpacity>

      {/* Modal DatePicker */}
      <DateTimePickerModal
        isVisible={pickerVisible}
        mode={pickerMode}
        date={pickerTarget === 'desde' ? fechaDesde : fechaHasta}
        onConfirm={handleConfirm}
        onCancel={() => setPickerVisible(false)}
        locale="es_CL"
        confirmTextIOS="Confirmar"
        cancelTextIOS="Cancelar"
      />

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#1E3A5F' },
  header:             { paddingTop: 50, paddingBottom: 16, marginBottom: 8 },
  headerTitulo:       { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  content:            { padding: 20 },
  label:              { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.85)', marginBottom: 8, marginTop: 16 },
  labelSmall:         { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.85)', marginBottom: 6 },
  input:              { backgroundColor: '#1A3347', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
                        borderRadius: 12, padding: 14, fontSize: 16, color: '#FFFFFF' },
  inputNota:          { height: 90, textAlignVertical: 'top' },
  inputHora:          { backgroundColor: '#1A3347', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
                        borderRadius: 12, padding: 14, fontSize: 16, color: '#FFFFFF' },
  puertas:            { flexDirection: 'row', gap: 10 },
  puertaBtn:          { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1.5,
                        borderColor: 'rgba(255,255,255,0.15)', backgroundColor: '#1E3A5F', alignItems: 'center' },
  puertaBtnActivo:    { backgroundColor: '#1E3A5F', borderColor: '#2E4A7A' },
  puertaTexto:        { fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  puertaTextoActivo:  { color: '#FFFFFF' },
  fechaRow:           { flexDirection: 'row', gap: 10, marginBottom: 8 },
  fechaBtn:           { backgroundColor: '#1A3347', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
                        borderRadius: 12, padding: 14 },
  fechaLabel:         { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 2 },
  fechaValor:         { fontSize: 16, color: '#FFFFFF', fontWeight: '600' },
  presetsRow:         { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  presetBtn:          { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
                        borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', backgroundColor: '#1E3A5F' },
  presetBtnActivo:    { backgroundColor: 'rgba(245,158,11,0.15)', borderColor: '#2E4A7A' },
  presetTexto:        { fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  presetTextoActivo:  { color: '#FFFFFF', fontWeight: '600' },
  diasRow:            { flexDirection: 'row', gap: 8 },
  diaBtn:             { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5,
                        borderColor: 'rgba(255,255,255,0.15)', backgroundColor: '#1E3A5F',
                        alignItems: 'center', justifyContent: 'center' },
  diaBtnActivo:       { backgroundColor: '#22C55E', borderColor: '#2E4A7A' },
  diaTexto:           { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  diaTextoActivo:     { color: '#FFFFFF' },
  switchRow:          { flexDirection: 'row', justifyContent: 'space-between',
                        alignItems: 'center', marginTop: 16 },
  horasRow:           { flexDirection: 'row', marginTop: 8 },
  boton:              { backgroundColor: '#2196F3', borderRadius: 12, padding: 18,
                        alignItems: 'center', marginTop: 32, marginBottom: 40 },
  botonDisabled:      { opacity: 0.6 },
  botonTexto:         { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  inputRow:           { flexDirection: 'row', gap: 10, alignItems: 'center' },
  btnAgenda:          { backgroundColor: '#F59E0B', borderWidth: 1.5, borderColor: '#2E4A7A',
                        borderRadius: 12, padding: 14, alignItems: 'center', justifyContent: 'center' },
  btnAgendaTexto:     { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  contactoNombre:     { fontSize: 13, color: '#22C55E', marginTop: 6, marginLeft: 4 },
});
