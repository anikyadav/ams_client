"use client";

import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

type Readiness = "starting" | "ready" | "failed";

export function useApiReadiness() {
  const [readiness, setReadiness] = useState<Readiness>("starting");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const deadline = setTimeout(() => {
      controller.abort();
      clearTimeout(retryTimer);
      setReadiness("failed");
    }, 120_000);

    async function check() {
      try {
        // Readiness is public and must not trigger the auth client's logout interceptor.
        await axios.get("/health/ready", {
          baseURL: api.defaults.baseURL,
          signal: controller.signal,
          timeout: 10_000,
          params: { _: Date.now() },
        });
        if (controller.signal.aborted) return;
        clearTimeout(deadline);
        setReadiness("ready");
      } catch {
        if (!controller.signal.aborted) {
          retryTimer = setTimeout(check, 3_000);
        }
      }
    }

    void check();
    return () => {
      controller.abort();
      clearTimeout(deadline);
      clearTimeout(retryTimer);
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setReadiness("starting");
    setAttempt((value) => value + 1);
  }, []);

  return { readiness, retry };
}
