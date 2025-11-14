"use client";

import { useQuery } from "@tanstack/react-query";
import type { Database } from "@/lib/database.types";
import { queryKeys } from "@/lib/query-keys";

type ParsedEmailRow = Database["public"]["Tables"]["parsed_emails"]["Row"];
type ParsedContractRow = Database["public"]["Tables"]["parsed_contracts"]["Row"];

type CalendarSourceRow = Database["public"]["Tables"]["calendar_sync_sources"]["Row"];
type CalendarRunRow = Database["public"]["Tables"]["calendar_sync_runs"]["Row"] & {
  source?: {
    id: string;
    source_url: string;
  } | null;
};

export function useParsedEmails(orgSlug: string) {
  return useQuery<ParsedEmailRow[]>({
    queryKey: queryKeys.parsedEmails(orgSlug),
    queryFn: async () => {
      const response = await fetch(`/api/${orgSlug}/ingestion/parsed-emails`);
      if (!response.ok) {
        throw new Error("Failed to fetch parsed emails");
      }
      return response.json();
    },
    staleTime: 30 * 1000,
  });
}

export function useParsedContracts(orgSlug: string) {
  return useQuery<ParsedContractRow[]>({
    queryKey: queryKeys.parsedContracts(orgSlug),
    queryFn: async () => {
      const response = await fetch(`/api/${orgSlug}/ingestion/parsed-contracts`);
      if (!response.ok) {
        throw new Error("Failed to fetch parsed contracts");
      }
      return response.json();
    },
    staleTime: 60 * 1000,
  });
}

export function useCalendarSources(orgSlug: string) {
  return useQuery<CalendarSourceRow[]>({
    queryKey: queryKeys.calendarSources(orgSlug),
    queryFn: async () => {
      const response = await fetch(`/api/${orgSlug}/calendar/sources`);
      if (!response.ok) {
        throw new Error("Failed to fetch calendar sources");
      }
      return response.json();
    },
    staleTime: 60 * 1000,
  });
}

export function useCalendarRuns(orgSlug: string) {
  return useQuery<CalendarRunRow[]>({
    queryKey: queryKeys.calendarRuns(orgSlug),
    queryFn: async () => {
      const response = await fetch(`/api/${orgSlug}/calendar/runs`);
      if (!response.ok) {
        throw new Error("Failed to fetch calendar sync runs");
      }
      return response.json();
    },
    staleTime: 60 * 1000,
  });
}
