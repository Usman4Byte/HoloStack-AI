CREATE TABLE "holostack"."intelligence_runs" (
  "id" uuid PRIMARY KEY, "workspace_id" uuid NOT NULL REFERENCES "holostack"."workspaces"("id"),
  "user_id" uuid NOT NULL REFERENCES "holostack"."users"("id"), "project_id" uuid NOT NULL REFERENCES "holostack"."projects"("id"),
  "graph_revision" integer NOT NULL, "name" text NOT NULL, "workload" jsonb NOT NULL,
  "capacity" jsonb NOT NULL, "findings" jsonb NOT NULL, "created_at" timestamptz NOT NULL
);
--> statement-breakpoint
CREATE INDEX "intelligence_project_time_idx" ON "holostack"."intelligence_runs" ("project_id", "created_at");
--> statement-breakpoint
CREATE INDEX "intelligence_workspace_time_idx" ON "holostack"."intelligence_runs" ("workspace_id", "created_at");
