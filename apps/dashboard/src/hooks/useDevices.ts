'use client';

import { DashboardEvents, type DeviceView } from '@smart-team/shared';
import { useEffect, useState } from 'react';
import { hubSocket } from '@/lib/socket';

export type HubConnection = 'connecting' | 'connected' | 'disconnected';

/** Live device list pushed by the hub. `devices` stays null until the first snapshot arrives. */
export function useDevices() {
  const [devices, setDevices] = useState<DeviceView[] | null>(null);
  const [connection, setConnection] = useState<HubConnection>('connecting');

  useEffect(() => {
    const socket = hubSocket();
    const onConnect = () => setConnection('connected');
    const onDisconnect = () => setConnection('disconnected');
    const onDevices = (snapshot: DeviceView[]) => setDevices(snapshot);

    if (socket.connected) onConnect();
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onDisconnect);
    socket.on(DashboardEvents.devices, onDevices);
    // The hub sends the snapshot when a socket connects; ask again for pages opened later.
    if (socket.connected) socket.emit(DashboardEvents.devices);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onDisconnect);
      socket.off(DashboardEvents.devices, onDevices);
    };
  }, []);

  return { devices, connection };
}
