// ============================================================
//  hooks/useBLE.js — Scanner BLE basado en HEADER (ROBUSTO)
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { BleManager } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';
import { decode as base64Decode } from 'base-64';

const RSSI_UMBRAL = -90;
const SCAN_RESTART_INTERVAL = 15000;
const BEACON_TIMEOUT = 3000;

// 🔹 base64 → HEX
function base64ToHex(base64) {
  if (!base64) return null;

  try {
    const raw = base64Decode(base64);

    let hex = '';

    for (let i = 0; i < raw.length; i++) {
      hex += raw.charCodeAt(i).toString(16).padStart(2, '0');
    }

    return hex.toLowerCase();

  } catch (e) {
    console.log('[BLE] Error base64ToHex:', e.message);
    return null;
  }
}

// 🔹 HEADER
function extractHeader(hex) {
  if (!hex || hex.length < 12) return null;

  return hex.substring(0, 12).toLowerCase();
}

export function useBLE(headersBD = [], onBeaconDetectado) {

  const [escaneando, setEscaneando] = useState(false);
  const [error, setError] = useState(null);
  const [headerDetectado, setHeaderDetectado] = useState(null);

  const deteccionCooldown = useRef(false);

  const manager = useRef(null);

  const scanTimeout = useRef(null);

  // 🔥 última vez que vimos beacon válido
  const ultimaDeteccion = useRef(0);

  // 🔥 interval pérdida beacon
  const beaconWatchdog = useRef(null);

  useEffect(() => {

    console.log('[BLE] useEffect - headersBD:', headersBD);

    if (headersBD.length === 0) {
      console.log('[BLE] Sin headers, saliendo');
      return;
    }

    if (!manager.current) {

      manager.current = new BleManager();

      console.log('[BLE] Manager creado');
    }

    // 🔵 Listener estado Bluetooth
    const subscription = manager.current.onStateChange((state) => {

      console.log('[BLE] Estado Bluetooth:', state);

      if (state === 'PoweredOn') {

        iniciarScan();

      } else {

        detenerScan();
      }

    }, true);

    solicitarPermisos().then(tienePermisos => {

      console.log('[BLE] Permisos:', tienePermisos);

      if (tienePermisos) {
        iniciarScan();
      }

    });

    // 🔥 watchdog de pérdida beacon
    beaconWatchdog.current = setInterval(() => {

      if (!headerDetectado) return;

      const diff = Date.now() - ultimaDeteccion.current;

      if (diff > BEACON_TIMEOUT) {

        console.log('[BLE] ⚠ Beacon perdido');

        setHeaderDetectado(null);
      }

    }, 1000);

    return () => {

      detenerScan();

      subscription.remove();

      if (beaconWatchdog.current) {
        clearInterval(beaconWatchdog.current);
      }
    };

  }, [headersBD.join(',')]);

  async function solicitarPermisos() {

    if (Platform.OS === 'android') {

      const apiLevel = Platform.Version;

      const permisos = [
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      ];

      if (apiLevel >= 31) {

        permisos.push(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN
        );

        permisos.push(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
        );
      }

      const granted = await PermissionsAndroid.requestMultiple(permisos);

      return Object.values(granted).every(
        v => v === 'granted'
      );
    }

    return true;
  }

  function iniciarScan() {

    if (!manager.current) return;

    // 🔥 evitar scans duplicados
    manager.current.stopDeviceScan();

    console.log('[BLE] ▶ Iniciando scan');

    setEscaneando(true);

    setError(null);

    manager.current.startDeviceScan(
      null,
      {
        allowDuplicates: true,
        scanMode: 2, // LOW_LATENCY
        callbackType: 1,
      },

      (err, device) => {

        if (err) {

          console.log('[BLE] ❌ Error scan:', err.message);

          setError(err.message);

          setEscaneando(false);

          // 🔁 reintento automático
          setTimeout(() => {
            iniciarScan();
          }, 2000);

          return;
        }

        if (!device) return;

        if (!device.manufacturerData) return;

        const hex = base64ToHex(device.manufacturerData);

        if (!hex) return;

        // 🔎 logs opcionales
        // console.log('[BLE RAW HEX]', hex);

        const header = extractHeader(hex);

        if (!header) return;

        // console.log('[BLE HEADER]', header);

        const headersLower = headersBD.map(
          h => h.toLowerCase()
        );

        const match = headersLower.includes(header);

        // console.log('[BLE DEBUG]', {
        //   headerLeido: header,
        //   headersBD: headersLower,
        //   match,
        //   rssi: device.rssi
        // });

        if (!match) return;

        const rssi = device.rssi ?? -100;

        if (rssi < RSSI_UMBRAL) return;

        // 🔥 actualiza última detección
        ultimaDeteccion.current = Date.now();

        // 🔥 actualiza estado UI
        if (headerDetectado !== header) {

          console.log('[BLE] ✅ Beacon detectado:', header);

          setHeaderDetectado(header);
        }

        // console.log(
        //   '[BLE MATCH INMEDIATO]',
        //   header,
        //   'RSSI:',
        //   rssi
        // );

        if (deteccionCooldown.current) {

          // console.log('[BLE] EN COOLDOWN');

          return;
        }

        deteccionCooldown.current = true;

        setTimeout(() => {
          deteccionCooldown.current = false;
        }, 2000);

        if (onBeaconDetectado) {

          onBeaconDetectado(header);
        }
      }
    );

    // 🔁 reinicio preventivo scan
    if (scanTimeout.current) {

      clearTimeout(scanTimeout.current);
    }

    scanTimeout.current = setTimeout(() => {

      console.log('[BLE] 🔁 Reinicio preventivo scan');

      detenerScan();

      setTimeout(() => {
        iniciarScan();
      }, 300);

    }, SCAN_RESTART_INTERVAL);
  }

  function detenerScan() {

    if (manager.current) {

      console.log('[BLE] ⏹ Deteniendo scan');

      manager.current.stopDeviceScan();
    }

    if (scanTimeout.current) {

      clearTimeout(scanTimeout.current);
    }

    setEscaneando(false);
  }

  return {
    escaneando,
    error,
    headerDetectado,
    detenerScan
  };
}