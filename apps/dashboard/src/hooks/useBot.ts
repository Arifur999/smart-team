'use client';

import { DashboardEvents, type BotMessageView, type BotStatus, type TeamId } from '@smart-team/shared';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { hubSocket } from '@/lib/socket';

/**
 * The command bot chat, shared by every open dashboard: the hub pushes each new or changed message.
 * `send` waits for the bot's reply, which can take a little while when it looks things up.
 */
export function useBot() {
  const [messages, setMessages] = useState<BotMessageView[] | null>(null);
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket = hubSocket();
    const onMessage = (message: BotMessageView) => setMessages((current) => upsert(current ?? [], message));
    // Listen first, then load, so a message that lands during the load is not lost.
    socket.on(DashboardEvents.botMessage, onMessage);
    api
      .botMessages()
      .then((list) => setMessages((current) => (current ?? []).reduce(upsert, list)))
      .catch((e: Error) => setError(e.message));
    api
      .botStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
    return () => {
      socket.off(DashboardEvents.botMessage, onMessage);
    };
  }, []);

  const send = useCallback(async (text: string, team: TeamId | null): Promise<BotMessageView | null> => {
    setThinking(true);
    setError(null);
    try {
      const reply = await api.botSend({ text, team });
      setMessages((current) => upsert(current ?? [], reply));
      return reply;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setThinking(false);
    }
  }, []);

  const answer = useCallback(async (messageId: string, actionId: string, confirm: boolean) => {
    setError(null);
    try {
      const updated = await api.botAnswer(messageId, actionId, confirm);
      setMessages((current) => upsert(current ?? [], updated));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  return { messages, status, thinking, error, send, answer };
}

function upsert(list: BotMessageView[], message: BotMessageView): BotMessageView[] {
  const rest = list.filter((m) => m.id !== message.id);
  return [...rest, message].sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
}
