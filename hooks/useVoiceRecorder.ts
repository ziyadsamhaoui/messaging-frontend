"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceRecorderState = "idle" | "requesting" | "recording" | "paused" | "error";

export interface RecordedVoice {
  blob: Blob;
  mimeType: string;
  durationSeconds: number;
}

const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/ogg",
  "audio/mp4",
];

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
    return undefined;
  }
  return MIME_CANDIDATES.find((candidate) => MediaRecorder.isTypeSupported(candidate));
}

export function useVoiceRecorder() {
  const [state, setState] = useState<VoiceRecorderState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const contextRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secondsRef = useRef(0);
  const stoppedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setInterval(() => {
      secondsRef.current += 1;
      setSeconds(secondsRef.current);
    }, 1000);
  }, [clearTimer]);

  const release = useCallback(() => {
    clearTimer();
    const recorder = recorderRef.current;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.onerror = null;
      if (recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch {}
      }
    }
    recorderRef.current = null;
    chunksRef.current = [];
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    const context = contextRef.current;
    contextRef.current = null;
    setAnalyser(null);
    if (context && context.state !== "closed") {
      void context.close().catch(() => undefined);
    }
    secondsRef.current = 0;
    stoppedRef.current = false;
  }, [clearTimer]);

  const reset = useCallback(() => {
    release();
    setState("idle");
    setSeconds(0);
  }, [release]);

  const start = useCallback(async () => {
    setError(null);
    release();
    setSeconds(0);
    stoppedRef.current = false;

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setError("This browser cannot record audio.");
      setState("error");
      return;
    }

    setState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 96_000 })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        setError("The recording stopped unexpectedly.");
        release();
        setState("error");
      };

      const context = new AudioContext();
      contextRef.current = context;
      const source = context.createMediaStreamSource(stream);
      const node = context.createAnalyser();
      node.fftSize = 256;
      node.smoothingTimeConstant = 0.75;
      source.connect(node);
      setAnalyser(node);

      recorder.start(250);
      secondsRef.current = 0;
      setState("recording");
      startTimer();
    } catch {
      release();
      setError("Microphone access was denied or unavailable.");
      setState("error");
    }
  }, [release, startTimer]);

  const pause = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "recording") return;
    recorder.pause();
    clearTimer();
    setState("paused");
  }, [clearTimer]);

  const resume = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "paused") return;
    recorder.resume();
    startTimer();
    setState("recording");
  }, [startTimer]);

  const stop = useCallback((): Promise<RecordedVoice> => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive" || stoppedRef.current) {
      return Promise.reject(new Error("There is no active recording."));
    }
    stoppedRef.current = true;
    const mimeType = recorder.mimeType || "audio/webm";
    const durationSeconds = secondsRef.current;

    return new Promise<RecordedVoice>((resolve, reject) => {
      recorder.onstop = () => {
        const chunks = chunksRef.current;
        release();
        setState("idle");
        setSeconds(0);
        const blob = new Blob(chunks, { type: mimeType });
        if (blob.size === 0) {
          reject(new Error("The recording is empty."));
          return;
        }
        resolve({ blob, mimeType, durationSeconds });
      };
      recorder.onerror = () => {
        release();
        setState("error");
        setError("The recording could not be completed.");
        reject(new Error("The recording could not be completed."));
      };
      try {
        recorder.stop();
      } catch {
        release();
        setState("idle");
        reject(new Error("The recording could not be completed."));
      }
    });
  }, [release]);

  const cancel = useCallback(() => {
    release();
    setState("idle");
    setSeconds(0);
    setError(null);
  }, [release]);

  useEffect(() => () => release(), [release]);

  return { state, seconds, error, analyser, start, pause, resume, stop, cancel, reset };
}
