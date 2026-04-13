// ============================================================
//  hooks/useBLE.js — Scanner BLE en segundo plano
//  Detecta el UUID del beacon del EG118 via RSSI
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { BleManager } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';

// Umbral RSSI — ajustar segun distancia deseada a la puerta
// -75 dBm ≈ 10-15 metros. Subir a -65 para mas precision (~5m)
const RSSI_UMBRAL = -75;

// UUIDs de los beacons — deben coincidir con los del EG118
// Se reciben como parametro para soportar multiples edificios


export function useBLE(uuidsBeacon = [], onBeaconDetectado) {
  const [escaneando, setEscaneando] = useState(false);
  const [error, setError] = useState(null);
  const [uuidDetectado, setUuidDetectado] = useState(null);
  const scanRef = useRef(null);
  const deteccionCooldown = useRef(false); // Evita multiples disparos seguidos
  const manager = useRef(null);

  
  useEffect(() => {
    
    console.log('[BLE] useEffect - uuidsBeacon:', uuidsBeacon);
    
    if (uuidsBeacon.length === 0) {
      console.log('[BLE] Sin UUIDs, saliendo');
      return;
    }

    // Inicializar manager si no existe
    if (!manager.current) {
      try {
        manager.current = new BleManager();
        console.log('[BLE] Manager creado');
      } catch (e) {
        console.log('[BLE] Error creando manager:', e.message);
        console.log('[BLE] No disponible:', e.message);
        return;
      }
    }

    solicitarPermisos().then(tienePermisos => {
      console.log('[BLE] Permisos:', tienePermisos);
      if (tienePermisos) iniciarScan();
    });

    return () => detenerScan();
  }, [uuidsBeacon.join(',')]);

  async function solicitarPermisos() {
    if (Platform.OS === 'android') {
      const apiLevel = Platform.Version;
      console.log('[BLE] Android API level:', apiLevel);
      
      const permisos = [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
      
      // BLUETOOTH_SCAN y BLUETOOTH_CONNECT solo para Android 12+ (API 31+)
      if (apiLevel >= 31) {
        permisos.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
        permisos.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
      }

      const granted = await PermissionsAndroid.requestMultiple(permisos);
      console.log('[BLE] Resultado permisos:', JSON.stringify(granted));
      return Object.values(granted).every(v => v === 'granted');
    }
    return true;
  }

  function iniciarScan() {

      if (!manager.current) {
    console.log('[BLE] Manager no disponible');
    return;
  }
    setEscaneando(true);
    setError(null);

    manager.current.startDeviceScan(
      null,      // null = escanear todos los UUIDs
      { allowDuplicates: true }, // Recibir cada advertising packet
      (err, device) => {
        if (err) {
          setError(err.message);
          setEscaneando(false);
          return;
        }

        if (!device || !device.serviceUUIDs) return;

        // Verificar si el UUID del dispositivo esta en la lista de beacons
        const uuidEncontrado = device.serviceUUIDs.find(uid =>
          uuidsBeacon.map(u => u.toLowerCase()).includes(uid.toLowerCase())
        );

        if (!uuidEncontrado) return;

        // Verificar RSSI — filtrar por distancia
        const rssi = device.rssi || -100;
        if (rssi < RSSI_UMBRAL) return;

        console.log(`[BLE] Beacon detectado: ${uuidEncontrado} | RSSI: ${rssi}`);
        setUuidDetectado(uuidEncontrado);

        // Cooldown de 10 segundos para no disparar multiples veces
        if (deteccionCooldown.current) return;
        deteccionCooldown.current = true;
        setTimeout(() => { deteccionCooldown.current = false; }, 10000);

        // Llamar al callback con el UUID detectado
        if (onBeaconDetectado) {
          onBeaconDetectado(uuidEncontrado);
        }
      }
    );
  }

  function detenerScan() {
      if (manager.current) {
    manager.current.stopDeviceScan();
  }
    setEscaneando(false);
  }

  return { escaneando, error, uuidDetectado, detenerScan };
}
