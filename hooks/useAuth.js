// ============================================================
//  hooks/useAuth.js — Manejo de sesion y JWT v2
//  Incluye membresias y membresia activa seleccionada
// ============================================================

import { useState, useEffect, createContext, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => { verificarSesionGuardada(); }, []);

  async function verificarSesionGuardada() {
    try {
      const token      = await SecureStore.getItemAsync('jwt_token');
      const perfil     = await SecureStore.getItemAsync('perfil');
      const numero     = await SecureStore.getItemAsync('numero_celular');
      const edificioId = await SecureStore.getItemAsync('edificio_id');
      const membresiaId= await SecureStore.getItemAsync('membresia_id');
      const nombre     = await SecureStore.getItemAsync('nombre');
      const membresiasStr = await SecureStore.getItemAsync('membresias');
      const membresias = membresiasStr ? JSON.parse(membresiasStr) : [];

      if (token && perfil && numero) {
        setUsuario({ numero, perfil, edificio_id: edificioId, membresia_id: membresiaId, nombre, membresias });
      }
    } catch (e) {
      console.log('Sin sesion guardada');
    } finally {
      setCargando(false);
    }
  }

  async function guardarSesion(token, perfil, numero, edificio_id, membresias = [], nombre = '') {
    // Determinar membresia activa (primera de la lista)
    const membresia_id = membresias.length > 0 ? membresias[0].membresia_id : null;

    await SecureStore.setItemAsync('jwt_token',     token);
    await SecureStore.setItemAsync('perfil',        perfil);
    await SecureStore.setItemAsync('numero_celular',numero);
    await SecureStore.setItemAsync('edificio_id',   edificio_id || '');
    await SecureStore.setItemAsync('membresia_id',  membresia_id || '');
    await SecureStore.setItemAsync('nombre',        nombre || '');
    await SecureStore.setItemAsync('membresias',    JSON.stringify(membresias));

    setUsuario({ numero, perfil, edificio_id, membresia_id, nombre, membresias });
  }

  async function cambiarMembresia(membresia) {
    /**
     * Cambia la membresia activa — usado cuando el propietario
     * tiene departamentos en multiples edificios.
     */
    await SecureStore.setItemAsync('membresia_id', membresia.membresia_id);
    await SecureStore.setItemAsync('edificio_id',  membresia.edificio_id);
    setUsuario(prev => ({
      ...prev,
      membresia_id: membresia.membresia_id,
      edificio_id:  membresia.edificio_id,
    }));
  }

  async function cerrarSesion() {
    await SecureStore.deleteItemAsync('jwt_token');
    await SecureStore.deleteItemAsync('perfil');
    await SecureStore.deleteItemAsync('numero_celular');
    await SecureStore.deleteItemAsync('edificio_id');
    await SecureStore.deleteItemAsync('membresia_id');
    await SecureStore.deleteItemAsync('nombre');
    await SecureStore.deleteItemAsync('membresias');
    setUsuario(null);
    router.replace('/(auth)/login');
  }

  return (
    <AuthContext.Provider value={{ usuario, cargando, guardarSesion, cerrarSesion, cambiarMembresia }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
