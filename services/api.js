// ============================================================
//  services/api.js — Cliente HTTP hacia el backend FastAPI
//  Todas las llamadas al backend pasan por aqui
// ============================================================

import * as SecureStore from 'expo-secure-store';

const BASE_URL = 'http://192.168.1.12:8000'; // Cambiar por IP real del servidor

// ---- helpers ----

async function getToken() {
  return await SecureStore.getItemAsync('jwt_token');
}

async function request(path, options = {}) {
  const token = await getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
      const response = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Error en el servidor');
      }

      return data;
    } catch (e) {
      throw new Error(`${e.message} | URL: ${BASE_URL}${path} | ${e.name}`);
    }
}

// ---- Auth ----

export const api = {

  // Solicita OTP SMS
  solicitarOTP: (numero_celular) =>
    request('/auth/otp/request', {
      method: 'POST',
      body: JSON.stringify({ numero_celular }),
    }),

  // Verifica OTP y retorna JWT + perfil
  verificarOTP: (numero_celular, codigo) =>
    request('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ numero_celular, codigo }),
    }),

  // Renueva el JWT
  refreshToken: () =>
    request('/auth/refresh', { method: 'POST' }),

  estadoPin: () => request('/auth/pin/estado'),

  verificarEstadoPin: (numero_celular) => request('/auth/pin/estado', {
    method: 'GET',
  }),

  crearPin: (pin) => request('/auth/pin/crear', {
    method: 'POST',
    body: JSON.stringify({ pin }),
  }),

  loginConPin: (numero_celular, pin) => request('/auth/pin/verificar', {
    method: 'POST',
    body: JSON.stringify({ numero_celular, pin }),
  }),

  estadoPinPublico: (numero_celular) => request('/auth/pin/estado-publico', {
    method: 'POST',
    body: JSON.stringify({ numero_celular }),
  }),

  // ---- Invitaciones ----

  crearInvitacion: (datos) =>
    request('/invitaciones', {
      method: 'POST',
      body: JSON.stringify(datos),
    }),

  listarInvitaciones: (estado = 'todas', membresia_id = null) =>
    request(`/invitaciones?estado=${estado}${membresia_id ? '&membresia_id=' + membresia_id : ''}`),

  invitacionesActivas: () =>
    request('/invitaciones/activas'),

  actualizarInvitacion: (id, datos) =>
    request(`/invitaciones/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(datos),
    }),

  cancelarInvitacion: (id) =>
    request(`/invitaciones/${id}`, { method: 'DELETE' }),

  // ---- Acceso ----

  solicitarAcceso: (uuid_ble, invitacion_id = null) =>
    request('/acceso/solicitar', {
      method: 'POST',
      body: JSON.stringify({ uuid_ble, invitacion_id }),
    }),

  logAccesos: (limite = 50) =>
    request(`/acceso/log?limite=${limite}`),

  listarPuertas: () =>
    request('/acceso/puertas'),

  // ---- Cuenta ----

  miCuenta: () => request('/cuenta/mia'),

  listarCohabitantes: () => request('/cuenta/cohabitantes'),

  agregarCohabitante: (datos) => request('/cuenta/cohabitantes', {
    method: 'POST',
    body: JSON.stringify(datos),
  }),

  eliminarCohabitante: (numero) =>
    request(`/cuenta/cohabitantes/${encodeURIComponent(numero)}`, { method: 'DELETE' }),

  actualizarCuenta: (datos) => request('/cuenta/mia', {
    method: 'PATCH',
    body: JSON.stringify(datos),
  }),

  // ---- Administrador ----

  adminInvitaciones: (estado = 'activa') =>
    request(`/admin/invitaciones?estado=${estado}`),

  adminCancelarInvitacion: (id) =>
    request(`/admin/invitaciones/${id}`, { method: 'DELETE' }),

  adminHistorial: (limite = 100) =>
    request(`/admin/historial?limite=${limite}`),

  adminPropietarios: () =>
    request('/admin/propietarios'),

  // ---- Dispositivos ----

  registrarPushToken: (token, plataforma) =>
    request('/dispositivos/push-token', {
      method: 'POST',
      body: JSON.stringify({ token, plataforma }),
    }),
};
