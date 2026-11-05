'use client';

import { DASHBOARD_NAMESPACE } from '@smart-team/shared';
import { io, type Socket } from 'socket.io-client';
import { hubUrl } from './hub';

let socket: Socket | undefined;

/** One live connection to the hub, shared by every page and hook. */
export function hubSocket(): Socket {
  socket ??= io(new URL(DASHBOARD_NAMESPACE, hubUrl()).toString());
  return socket;
}
