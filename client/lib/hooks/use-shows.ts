// React Hook for Shows
// Easy-to-use hook for React components

"use client";

import { useState, useEffect } from "react";
import { showsApi } from "../api-client/shows";
import type {
  ShowWithVenue,
  CreateShowRequest,
  UpdateShowRequest,
} from "@/../backend/src/types";

export function useShows(orgId: string, upcoming: boolean = false) {
  const [shows, setShows] = useState<ShowWithVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchShows = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await showsApi.list({ org_id: orgId, upcoming });
      setShows(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orgId) {
      fetchShows();
    }
  }, [orgId, upcoming]);

  const createShow = async (data: CreateShowRequest) => {
    try {
      const newShow = await showsApi.create(data);
      setShows((prev) => [newShow, ...prev]);
      return newShow;
    } catch (err) {
      throw err;
    }
  };

  const updateShow = async (id: string, data: UpdateShowRequest) => {
    try {
      const updatedShow = await showsApi.update(id, orgId, data);
      setShows((prev) =>
        prev.map((show) => (show.id === id ? updatedShow : show))
      );
      return updatedShow;
    } catch (err) {
      throw err;
    }
  };

  const deleteShow = async (id: string) => {
    try {
      await showsApi.delete(id, orgId);
      setShows((prev) => prev.filter((show) => show.id !== id));
    } catch (err) {
      throw err;
    }
  };

  return {
    shows,
    loading,
    error,
    refresh: fetchShows,
    createShow,
    updateShow,
    deleteShow,
  };
}

export function useShow(showId: string, orgId: string) {
  const [show, setShow] = useState<ShowWithVenue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchShow = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await showsApi.getById(showId, orgId);
      setShow(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showId && orgId) {
      fetchShow();
    }
  }, [showId, orgId]);

  return {
    show,
    loading,
    error,
    refresh: fetchShow,
  };
}
