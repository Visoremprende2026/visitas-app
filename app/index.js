// ============================================================
//  app/index.js — Pantalla inicial v2
//  Redirige segun perfil del JWT
// ============================================================

import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';

export default function Index() {
  const { usuario, cargando } = useAuth();

useEffect(() => {
  if (cargando) return;

  if (!usuario) {
    router.replace('/(auth)/login');
    return;
  }

  if (usuario.perfil === 'administrador') {
    router.replace('/(admin)/invitaciones');
  } else if (usuario.perfil === 'propietario') {
    router.replace('/(propietario)/visitas');
  } else {
    router.replace('/(invitado)/entrada');
  }
}, [cargando, usuario]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2E4A7A" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1E3A5F' },
});
