"use client";
import { Dashboard } from "@/components/projects/dashboard";

export function GuestDashboard({ status, query, defaultTemplateId }: { status: string; query: string; defaultTemplateId?: string }) {
  return <Dashboard name="Guest" listing={{ projects: [], total: 0, page: 1, pageSize: 50 }} status={status} query={query} guestMode defaultTemplateId={defaultTemplateId} />;
}
