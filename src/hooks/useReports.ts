"use client";

import { useEffect, useRef, useState } from "react";

export function useReports() {
  const [reportCount, setReportCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    fetch("/api/reports")
      .then((r) => {
        if (r.status === 401) return null; // unauthenticated — Phase 1, show 0
        return r.json();
      })
      .then((json) => {
        if (json?.data && Array.isArray(json.data)) {
          setReportCount(json.data.length);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { reportCount, loading };
}
