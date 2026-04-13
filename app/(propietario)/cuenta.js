// ============================================================
//  app/(propietario)/cuenta.js — Mi cuenta
// ============================================================

import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, ScrollView
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import * as Contacts from 'expo-contacts';

const DIAS_LABELS = { '1':'Lun','2':'Mar','3':'Mie','4':'Jue','5':'Vie','6':'Sab','7':'Dom' };

export default function MiCuenta() {
  const { usuario, cerrarSesion } = useAuth();
  const [nombre, setNombre] = useState(usuario?.nombre || '');
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mostrarCambioPin, setMostrarCambioPin] = useState(false);
  const [pinActual, setPinActual] = useState('');
  const [pinNuevo, setPinNuevo] = useState('');
  const [pinConfirmar, setPinConfirmar] = useState('');
  const [guardandoPin, setGuardandoPin] = useState(false);
  const [cohabitantes, setCohabitantes] = useState([]);
  const [nuevoNumero, setNuevoNumero] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [agregando, setAgregando] = useState(false);
  const [mostrarFormCohabitante, setMostrarFormCohabitante] = useState(false);

  useEffect(() => { cargarCohabitantes(); }, []);

  async function cargarCohabitantes() {
    try {
      const data = await api.listarCohabitantes();
      setCohabitantes(data);
    } catch (e) {
      console.log('Error cargando cohabitantes:', e.message);
    }
  }

  async function seleccionarContactoCohabitante() {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') return;
      const resultado = await Contacts.presentContactPickerAsync();
      if (resultado?.phoneNumbers?.length > 0) {
        setNuevoNumero(resultado.phoneNumbers[0].number.replace(/\s|-/g, ''));
        if (resultado.name) setNuevoNombre(resultado.name);
      }
    } catch (e) {
      console.log('Error contactos:', e.message);
    }
  }

  async function handleAgregarCohabitante() {
    const num = nuevoNumero.trim();
    if (num.length < 9) {
      Alert.alert('Error', 'Ingresa un numero valido.');
      return;
    }
    const numFormateado = num.startsWith('+') ? num : `+56${num.replace(/^0/, '')}`;
    setAgregando(true);
    try {
      await api.agregarCohabitante({ numero_celular: numFormateado, nombre: nuevoNombre.trim() });
      setNuevoNumero('');
      setNuevoNombre('');
      setMostrarFormCohabitante(false);
      await cargarCohabitantes();
      Alert.alert('Listo', 'Cohabitante agregado correctamente.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setAgregando(false);
    }
  }

  async function handleEliminarCohabitante(numero) {
    Alert.alert('Eliminar cohabitante', '¿Seguro que deseas eliminarlo?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try {
          await api.eliminarCohabitante(numero);
          await cargarCohabitantes();
        } catch (e) {
          Alert.alert('Error', e.message);
        }
      }},
    ]);
  }

  async function handleCambiarPin() {
    if (pinNuevo.length < 4) {
      Alert.alert('Error', 'El PIN debe tener al menos 4 digitos.');
      return;
    }
    if (pinNuevo !== pinConfirmar) {
      Alert.alert('Error', 'Los PINs no coinciden.');
      return;
    }
    setGuardandoPin(true);
    try {
      await api.crearPin(pinNuevo);
      setPinActual(''); setPinNuevo(''); setPinConfirmar('');
      setMostrarCambioPin(false);
      Alert.alert('Listo', 'PIN actualizado correctamente.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setGuardandoPin(false);
    }
  }

  async function handleGuardar() {
    if (!nombre.trim()) {
      Alert.alert('Error', 'Ingresa tu nombre.');
      return;
    }
    setGuardando(true);
    try {
      await api.actualizarCuenta({ nombre: nombre.trim() });
      setEditando(false);
      Alert.alert('Listo', 'Nombre actualizado correctamente.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      <View style={styles.avatar}>
        <Text style={styles.avatarTexto}>
          {(nombre || usuario?.numero_celular || '?')[0].toUpperCase()}
        </Text>
      </View>

      <Text style={styles.seccion}>Datos personales</Text>

      <Text style={styles.label}>Nombre</Text>
      {editando ? (
        <View style={styles.editRow}>
          <TextInput style={[styles.input, { flex: 1 }]}
            value={nombre} onChangeText={setNombre}
            placeholder="Tu nombre completo" placeholderTextColor="rgba(229,231,235,0.5)"
            autoFocus />
          <TouchableOpacity style={styles.btnGuardar} onPress={handleGuardar} disabled={guardando}>
            {guardando
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.btnGuardarTexto}>Guardar</Text>
            }
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.campoRow} onPress={() => setEditando(true)}>
          <Text style={styles.campoValor}>{nombre || 'Sin nombre'}</Text>
          <Text style={styles.campoEditar}>Editar</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.label}>Numero de celular</Text>
      <View style={styles.campoRow}>
        <Text style={styles.campoValor}>{usuario?.numero_celular}</Text>
      </View>

      <Text style={styles.seccion}>Mis unidades</Text>

      {(usuario?.membresias || []).map((m, i) => (
        <View key={i} style={styles.membresiaCard}>
          <View style={styles.membresiaHeader}>
            <Text style={styles.membresiaEdificio}>{m.edificio_nombre}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeTexto}>{m.rol}</Text>
            </View>
          </View>
          <Text style={styles.membresiaUnidad}>{m.unidad || 'Sin unidad asignada'}</Text>
        </View>
      ))}

      <Text style={styles.seccion}>Mis cohabitantes</Text>

      {cohabitantes.map((c, i) => (
        <View key={i} style={styles.cohabitanteCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cohabitanteNombre}>{c.nombre || 'Sin nombre'}</Text>
            <Text style={styles.cohabitanteNumero}>{c.numero_celular}</Text>
          </View>
          <TouchableOpacity onPress={() => handleEliminarCohabitante(c.numero_celular)}>
            <Text style={styles.btnEliminar}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      ))}

      {mostrarFormCohabitante ? (
        <View style={styles.formCohabitante}>
          <View style={styles.inputRow}>
            <TextInput style={[styles.input, { flex: 1 }]}
              placeholder="+56 9 1234 5678" placeholderTextColor="rgba(229,231,235,0.5)"
              keyboardType="phone-pad" value={nuevoNumero}
              onChangeText={v => { setNuevoNumero(v); setNuevoNombre(''); }} />
            <TouchableOpacity style={styles.btnAgenda} onPress={seleccionarContactoCohabitante}>
              <Text style={styles.btnAgendaTexto}>Agenda</Text>
            </TouchableOpacity>
          </View>
          {nuevoNombre ? <Text style={styles.contactoNombre}>{nuevoNombre}</Text> : null}
          <View style={styles.botonesRow}>
            <TouchableOpacity style={[styles.btnGuardar, { flex: 1 }]}
              onPress={handleAgregarCohabitante} disabled={agregando}>
              {agregando
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.btnGuardarTexto}>Agregar</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnCancelar}
              onPress={() => { setMostrarFormCohabitante(false); setNuevoNumero(''); setNuevoNombre(''); }}>
              <Text style={styles.btnCancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.btnAgregar}
          onPress={() => setMostrarFormCohabitante(true)}>
          <Text style={styles.btnAgregarTexto}>+ Agregar cohabitante</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.seccion}>Seguridad</Text>

      {mostrarCambioPin ? (
        <View style={styles.formCohabitante}>
          <Text style={styles.label}>PIN nuevo</Text>
          <TextInput style={styles.input} placeholder="••••" placeholderTextColor="rgba(255,255,255,0.4)"
            keyboardType="number-pad" secureTextEntry maxLength={6}
            value={pinNuevo} onChangeText={v => { if (v.length <= 6) setPinNuevo(v); }} />
          <Text style={styles.label}>Confirmar PIN</Text>
          <TextInput style={styles.input} placeholder="••••" placeholderTextColor="rgba(255,255,255,0.4)"
            keyboardType="number-pad" secureTextEntry maxLength={6}
            value={pinConfirmar} onChangeText={v => { if (v.length <= 6) setPinConfirmar(v); }} />
          <View style={styles.botonesRow}>
            <TouchableOpacity style={[styles.btnGuardar, { flex: 1 }]}
              onPress={handleCambiarPin} disabled={guardandoPin}>
              {guardandoPin
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.btnGuardarTexto}>Guardar PIN</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnCancelar}
              onPress={() => { setMostrarCambioPin(false); setPinNuevo(''); setPinConfirmar(''); }}>
              <Text style={styles.btnCancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.btnAgregar} onPress={() => setMostrarCambioPin(true)}>
          <Text style={styles.btnAgregarTexto}>Cambiar PIN</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.btnSalir} onPress={cerrarSesion}>
        <Text style={styles.btnSalirTexto}>Cerrar sesion</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: '#1E3A5F' },
  content:           { padding: 20, paddingBottom: 40 },
  avatar:            { width: 80, height: 80, borderRadius: 40, backgroundColor: '#1E3A5F',
                       alignItems: 'center', justifyContent: 'center', alignSelf: 'center',
                       marginBottom: 24 },
  avatarTexto:       { fontSize: 36, fontWeight: '700', color: '#FFFFFF' },
  seccion:           { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase',
                       letterSpacing: 1, marginTop: 24, marginBottom: 12 },
  label:             { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 4 },
  campoRow:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                       backgroundColor: '#2196F3', borderRadius: 10, padding: 14,
                       marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  campoValor:        { fontSize: 16, color: '#FFFFFF' },
  campoEditar:       { fontSize: 14, color: '#F59E0B', fontWeight: '600' },
  editRow:           { flexDirection: 'row', gap: 10, marginBottom: 10 },
  input:             { backgroundColor: '#1A3347', borderWidth: 1.5, borderColor: '#2E4A7A',
                       borderRadius: 10, padding: 14, fontSize: 16, color: '#FFFFFF' },
  btnGuardar:        { backgroundColor: '#2196F3', borderRadius: 10, padding: 14,
                       alignItems: 'center', justifyContent: 'center' },
  btnGuardarTexto:   { color: '#FFFFFF', fontWeight: '600' },
  membresiaCard:     { backgroundColor: '#2196F3', borderRadius: 10, padding: 14,
                       marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  membresiaHeader:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  membresiaEdificio: { fontSize: 15, fontWeight: '700', color: '#F59E0B' },
  badge:             { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10,
                       backgroundColor: 'rgba(245,158,11,0.15)' },
  badgeTexto:        { fontSize: 12, fontWeight: '600', color: '#F59E0B' },
  membresiaUnidad:   { fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  btnSalir:          { marginTop: 32, borderWidth: 1.5, borderColor: '#EF4444',
                       borderRadius: 12, padding: 16, alignItems: 'center' },
  btnSalirTexto:     { color: '#EF4444', fontSize: 15, fontWeight: '600' },
  cohabitanteCard:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E3A5F',
                       borderRadius: 10, padding: 14, marginBottom: 8,
                       borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  cohabitanteNombre: { fontSize: 15, color: '#FFFFFF', fontWeight: '600' },
  cohabitanteNumero: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  btnEliminar:       { color: '#EF4444', fontSize: 13, fontWeight: '600' },
  formCohabitante:   { backgroundColor: '#2196F3', borderRadius: 10, padding: 14,
                       marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  inputRow:          { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 8 },
  botonesRow:        { flexDirection: 'row', gap: 10, marginTop: 8 },
  btnAgenda:         { backgroundColor: 'rgba(245,158,11,0.15)', borderWidth: 1.5, borderColor: '#2E4A7A',
                       borderRadius: 10, padding: 14, alignItems: 'center' },
  btnAgendaTexto:    { color: '#F59E0B', fontSize: 13, fontWeight: '600' },
  contactoNombre:    { fontSize: 13, color: '#22C55E', marginBottom: 6 },
  btnAgregar:        { borderWidth: 1.5, borderColor: '#2E4A7A', borderRadius: 10,
                       padding: 14, alignItems: 'center', marginBottom: 8 },
  btnAgregarTexto:   { color: '#F59E0B', fontSize: 14, fontWeight: '600' },
  btnCancelar:       { borderWidth: 1.5, borderColor: '#999', borderRadius: 10,
                       padding: 14, alignItems: 'center', justifyContent: 'center' },
  btnCancelarTexto:  { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600' },
});
