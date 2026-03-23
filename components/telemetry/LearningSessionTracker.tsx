"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

interface EventPayload {
  event_type: string;
  topic?: string;
  phase_id?: number;
  task_id?: number;
  payload?: Record<string, unknown>;
}

interface RouteMeta {
  pathname: string;
  routeType: string;
  phaseId?: number;
  taskId?: number;
}

function parseRouteMeta(pathname: string): RouteMeta {
  const taskMatch = pathname.match(/^\/(learn|lab|quiz)\/(\d+)/);
  if (taskMatch) {
    return {
      pathname,
      routeType: taskMatch[1],
      taskId: Number(taskMatch[2]),
    };
  }

  const phaseMatch = pathname.match(/^\/phases\/(\d+)/);
  if (phaseMatch) {
    return {
      pathname,
      routeType: "phase",
      phaseId: Number(phaseMatch[1]),
    };
  }

  const normalized = pathname === "/" ? "home" : pathname.replace(/^\//, "").split("/")[0];
  return {
    pathname,
    routeType: normalized || "home",
  };
}

function isTrackable(pathname: string): boolean {
  return !pathname.startsWith("/api");
}

export function LearningSessionTracker() {
  const pathname = usePathname();
  const queueRef = useRef<EventPayload[]>([]);
  const activeMetaRef = useRef<RouteMeta>(parseRouteMeta(pathname));
  const activeSinceRef = useRef<number | null>(null);
  const pendingMsRef = useRef(0);
  const focusedRef = useRef(true);

  const queueEvent = useCallback((event: EventPayload) => {
    queueRef.current.push(event);
  }, []);

  const flushEvents = useCallback((useBeacon = false) => {
    if (queueRef.current.length === 0) return;

    const body = JSON.stringify({ events: queueRef.current });
    queueRef.current = [];

    if (useBeacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/events", blob);
      return;
    }

    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: useBeacon,
    }).catch(() => {});
  }, []);

  const consumeActiveTime = useCallback(() => {
    if (activeSinceRef.current === null) return;
    const now = Date.now();
    pendingMsRef.current += now - activeSinceRef.current;
    activeSinceRef.current = now;
  }, []);

  const emitSessionTime = useCallback((force = false) => {
    consumeActiveTime();
    const minimumMs = force ? 10_000 : 30_000;
    if (pendingMsRef.current < minimumMs) return;

    const meta = activeMetaRef.current;
    const seconds = Math.round(pendingMsRef.current / 1000);
    pendingMsRef.current = 0;

    queueEvent({
      event_type: "session_time",
      phase_id: meta.phaseId,
      task_id: meta.taskId,
      payload: {
        seconds,
        pathname: meta.pathname,
        route_type: meta.routeType,
      },
    });
  }, [consumeActiveTime, queueEvent]);

  const resumeTracking = useCallback(() => {
    if (!isTrackable(activeMetaRef.current.pathname)) return;
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    if (!focusedRef.current) return;
    if (activeSinceRef.current === null) activeSinceRef.current = Date.now();
  }, []);

  const pauseTracking = useCallback((flush = false) => {
    if (activeSinceRef.current !== null) {
      pendingMsRef.current += Date.now() - activeSinceRef.current;
      activeSinceRef.current = null;
    }
    if (flush) emitSessionTime(true);
  }, [emitSessionTime]);

  useEffect(() => {
    const nextMeta = parseRouteMeta(pathname);
    const prevMeta = activeMetaRef.current;

    if (prevMeta.pathname !== nextMeta.pathname) {
      pauseTracking(true);
      flushEvents();
    }

    activeMetaRef.current = nextMeta;

    if (isTrackable(nextMeta.pathname)) {
      queueEvent({
        event_type: "page_visit",
        phase_id: nextMeta.phaseId,
        task_id: nextMeta.taskId,
        payload: {
          pathname: nextMeta.pathname,
          route_type: nextMeta.routeType,
        },
      });
    }

    resumeTracking();
  }, [flushEvents, pathname, pauseTracking, queueEvent, resumeTracking]);

  useEffect(() => {
    resumeTracking();

    const interval = window.setInterval(() => {
      emitSessionTime(false);
      flushEvents();
    }, 10_000);

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        pauseTracking(true);
        flushEvents(true);
      } else {
        resumeTracking();
      }
    };

    const handleFocus = () => {
      focusedRef.current = true;
      resumeTracking();
    };

    const handleBlur = () => {
      focusedRef.current = false;
      pauseTracking(true);
      flushEvents();
    };

    const handlePageHide = () => {
      pauseTracking(true);
      flushEvents(true);
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("pagehide", handlePageHide);
      pauseTracking(true);
      flushEvents(true);
    };
  }, [emitSessionTime, flushEvents, pauseTracking, resumeTracking]);

  return null;
}
