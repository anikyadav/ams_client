"use client";

import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

type Readiness = "starting" | "ready" | "failed";

function isTemporaryFailure(error: unknown) {
  return axios.isAxiosError(error) && !axios.isCancel(error) &&
    (!error.response || error.response.status >= 500 || error.response.status === 408);
}

function pause(signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    const timer = setTimeout(finish, 3_000);
    signal.addEventListener("abort", finish, { once: true });
    if (signal.aborted) finish();
  });
}

export function useApiReadiness() {
  const [readiness, setReadiness] = useState<Readiness>("starting");
  const [elapsed, setElapsed] = useState(0);
  const active = useRef<AbortController | null>(null);

  // One deadline covers readiness and login retries, including hung requests.
  const run = useCallback(async (signIn?: (signal: AbortSignal) => Promise<unknown>) => {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    const { signal } = controller;
    const started = Date.now();
    setElapsed(0);
    setReadiness("starting");
    const ticker = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1_000);
    const deadline = setTimeout(() => {
      controller.abort();
      setReadiness("failed");
    }, 120_000);

    try {
      while (!signal.aborted) {
        try {
          // Public readiness checks must not invoke the auth logout interceptor.
          await axios.get("/health/ready", {
            baseURL: api.defaults.baseURL,
            signal,
            timeout: 10_000,
            params: { _: Date.now() },
          });
        } catch {
          if (signal.aborted) return false;
          await pause(signal);
          continue;
        }
        if (signal.aborted) return false;
        if (signIn) {
          try {
            await signIn(signal);
          } catch (error) {
            if (signal.aborted) return false;
            if (!isTemporaryFailure(error)) {
              setReadiness("ready");
              throw error;
            }
            await pause(signal);
            continue;
          }
        }
        if (signal.aborted) return false;
        setReadiness("ready");
        return true;
      }
      return false;
    } finally {
      clearTimeout(deadline);
      clearInterval(ticker);
    }
  }, []);

  useEffect(() => {
    const initialCheck = setTimeout(() => { void run(); }, 0);
    return () => {
      clearTimeout(initialCheck);
      active.current?.abort();
    };
  }, [run]);

  return { readiness, elapsed, run };
}
