'use client';

import { DASHBOARD_NAMESPACE, DashboardEvents, type DeviceView } from '@smart-team/shared';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { hubUrl } from '@/lib/hub';

export type HubConnection = 'connecting' | 'connected' | 'disconnected';

/** Live device list pushed by the hub. `devices` stays null until the first snapshot arrives. */
export function useDevices() {
  const [devices, setDevices] = useState<DeviceView[] | null>(null);
  const [connection, setConnection] = useState<HubConnection>('connecting');

  useEffect(() => {
    const socket = io(new URL(DASHBOARD_NAMESPACE, hubUrl()).toString());
    socket.on('connect', () => setConnection('connected'));
    socket.on('disconnect', () => setConnection('disconnected'));
    socket.on('connect_error', () => setConnection('disconnected'));
    socket.on(DashboardEvents.devices, (snapshot: DeviceView[]) => setDevices(snapshot));
    return () => {
      socket.close();
    };
  }, []);

  return { devices, connection };
}
