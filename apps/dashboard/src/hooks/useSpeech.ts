'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

/** The parts of the browser's Web Speech API used here (Chrome and Edge ship it as webkitSpeechRecognition). */
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
}
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const noSubscribe = () => () => {};

/**
 * Voice input: speak, and the words arrive as you talk (`final` is true once you stop).
 * `supported` is false on browsers without speech recognition, such as Firefox.
 */
export function useSpeechInput(onText: (text: string, final: boolean) => void, lang: string) {
  const supported = useSyncExternalStore(noSubscribe, () => recognitionCtor() !== null, () => false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const callback = useRef(onText);

  useEffect(() => {
    callback.current = onText;
  }, [onText]);

  useEffect(() => () => recognition.current?.abort(), []);

  const start = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = lang;
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (event) => {
      const results = Array.from(event.results);
      callback.current(results.map((res) => res[0].transcript).join(''), results.every((res) => res.isFinal));
    };
    r.onerror = (event) => setError(event.error === 'not-allowed' ? 'Allow the microphone for this site to use voice.' : `Voice input stopped: ${event.error}`);
    r.onend = () => setListening(false);
    recognition.current = r;
    setError(null);
    r.start();
    setListening(true);
  }, [lang]);

  const stop = useCallback(() => recognition.current?.stop(), []);

  return { supported, listening, error, start, stop };
}

/** Reads text aloud with the browser's built-in voice. */
export function speak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text.replace(/[*_`#>]/g, ''));
  utterance.lang = 'en-US';
  window.speechSynthesis.speak(utterance);
}
