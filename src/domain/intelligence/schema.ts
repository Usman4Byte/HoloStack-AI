import { z } from "zod";

export const workloadSchema = z.object({
  requestsPerSecond: z.number().finite().min(0).max(10_000_000),
  concurrentUsers: z.number().finite().min(0).max(100_000_000),
  requestsPerUserPerMinute: z.number().finite().min(0).max(600),
  readShare: z.number().finite().min(0).max(1),
}).strict();
export type Workload = z.infer<typeof workloadSchema>;

export const workloadPresets: { id: string; label: string; workload: Workload; note: string }[] = [
  { id: "mvp", label: "MVP baseline", workload: { requestsPerSecond: 80, concurrentUsers: 1200, requestsPerUserPerMinute: 4, readShare: 0.72 }, note: "Balanced early access workload." },
  { id: "read-heavy", label: "Read heavy", workload: { requestsPerSecond: 800, concurrentUsers: 9000, requestsPerUserPerMinute: 6, readShare: 0.94 }, note: "Read-dominant product traffic." },
  { id: "write-heavy", label: "Write heavy", workload: { requestsPerSecond: 500, concurrentUsers: 3500, requestsPerUserPerMinute: 8, readShare: 0.25 }, note: "Frequent mutations and ingestion." },
  { id: "burst", label: "Burst scenario", workload: { requestsPerSecond: 2500, concurrentUsers: 20_000, requestsPerUserPerMinute: 10, readShare: 0.8 }, note: "Short peak scenario; not a traffic forecast." },
];

export const scenarioSaveSchema = z.object({ name: z.string().trim().min(1).max(80), workload: workloadSchema, expectedRevision: z.number().int().min(1).max(2147483646) }).strict();
