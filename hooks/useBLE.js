// ============================================================
//  hooks/useBLE.js — Scanner BLE para iBeacons
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { BleManager } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';
import { decode as base64Decode } from 'base-64';

const RSSI_UMBRAL = -75;

// Parsea el UUID de un iBeacon desde manufacturerData (base64)
function parseIBeaconUUID(manufacturerDataBase64) {
  if (!manufacturerDataBase64) return null;
  
  try {
    const raw = base64Decode(manufacturerDataBase64);
    // iBeacon format: 2 bytes company (Apple 0x004C) + 2 bytes type + 16 bytes UUID + 2 major + 2 minor + 1 tx
    // El UUID empieza en el byte 4 y tiene 16 bytes
    if (raw.length < 20) return null;
    
    const bytes = [];
    for (let i = 0; i < raw.length; i++) {
      bytes.push(raw.charCodeAt(i));
    }
    
    // Verificar que es iBeacon (company 0x4C00, type 0x0215)
    if (bytes[0] !== 0x4C || bytes[1] !== 0x00) return null;
    if (bytes[2] !== 0x02 || bytes[3] !== 0x15) return null;
    
    // Extraer UUID (bytes 4-19)
    const uuidBytes = bytes.slice(4, 20);
    const uuid = [
      uuidBytes.slice(0, 4),
      uuidBytes.slice(4, 6),
      uuidBytes.slice(6, 8),
      uuidBytes.slice(8, 10),
      uuidBytes.slice(10, 16),
    ].map(part => 
      part.map(b => b.toString(16).padStart(2, '0')).join('')
    ).join('-');
    
    return uuid.toLowerCase();
  } catch (e) {
    console.log('[BLE] Error parseando iBeacon:', e.message);
    return null;
  }
}

export function useBLE(uuidsBeacon = [], onBeaconDetectado) {
  const [escaneando, setEscaneando] = useState(false);
  const [error, setError] = useState(null);
  const [uuidDetectado, setUuidDetectado] = useState(null);
  const deteccionCooldown = useRef(false);
  const manager = useRef(null);

  useEffect(() => {
    console.log('[BLE] useEffect - uuidsBeacon:', uuidsBeacon);
    
    if (uuidsBeacon.length === 0) {
      console.log('[BLE] Sin UUIDs, saliendo');
      return;
    }

    if (!manager.current) {
      try {
        manager.current = new BleManager();
        console.log('[BLE] Manager creado');
      } catch (e) {
        console.log('[BLE] Error creando manager:', e.message);
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
      null,
      { allowDuplicates: true },
      (err, device) => {
        if (err) {
          setError(err.message);
          setEscaneando(false);
          return;
        }

        if (!device) return;

        // Intentar parsear como iBeacon
        const beaconUUID = parseIBeaconUUID(device.manufacturerData);
        
        if (!beaconUUID) return;

        // Verificar si el UUID está en la lista
        const uuidsLower = uuidsBeacon.map(u => u.toLowerCase());
        if (!uuidsLower.includes(beaconUUID)) return;

        // Verificar RSSI
        const rssi = device.rssi || -100;
        if (rssi < RSSI_UMBRAL) return;

        console.log(`[BLE] iBeacon detectado: ${beaconUUID} | RSSI: ${rssi}`);
        setUuidDetectado(beaconUUID);

        if (deteccionCooldown.current) return;
        deteccionCooldown.current = true;
        setTimeout(() => { deteccionCooldown.current = false; }, 10000);

        if (onBeaconDetectado) {
          onBeaconDetectado(beaconUUID);
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