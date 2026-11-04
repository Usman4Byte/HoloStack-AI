CREATE TABLE "holostack"."ai_quota_counters" (
  "quota_key" text PRIMARY KEY, "day_key" text NOT NULL, "used" integer NOT NULL CHECK ("used" >= 0),
  "created_at" timestamptz NOT NULL
);
--> statement-breakpoint
CREATE INDEX "ai_quota_day_idx" ON "holostack"."ai_quota_counters" ("day_key");
--> statement-breakpoint
CREATE TABLE "holostack"."ai_usage_records" (
  "id" uuid PRIMARY KEY, "workspace_id" uuid NOT NULL REFERENCES "holostack"."workspaces"("id"),
  "user_id" uuid NOT NULL REFERENCES "holostack"."users"("id"), "project_id" uuid REFERENCES "holostack"."projects"("id"),
  "feature" text NOT NULL, "model" text NOT NULL, "status" text NOT NULL, "error_code" text,
  "input_tokens" integer, "output_tokens" integer, "created_at" timestamptz NOT NULL, "completed_at" timestamptz
);
--> statement-breakpoint
CREATE INDEX "ai_usage_user_time_idx" ON "holostack"."ai_usage_records" ("user_id", "created_at");
--> statement-breakpoint
CREATE INDEX "ai_usage_workspace_time_idx" ON "holostack"."ai_usage_records" ("workspace_id", "created_at");
--> statement-breakpoint
CREATE TABLE "holostack"."ai_artifacts" (
  "id" uuid PRIMARY KEY, "usage_id" uuid NOT NULL REFERENCES "holostack"."ai_usage_records"("id"),
  "workspace_id" uuid NOT NULL REFERENCES "holostack"."workspaces"("id"),
  "user_id" uuid NOT NULL REFERENCES "holostack"."users"("id"), "project_id" uuid NOT NULL REFERENCES "holostack"."projects"("id"),
  "kind" text NOT NULL, "payload" jsonb NOT NULL, "created_at" timestamptz NOT NULL
);
--> statement-breakpoint
CREATE INDEX "ai_artifacts_project_time_idx" ON "holostack"."ai_artifacts" ("project_id", "created_at");
--> statement-breakpoint
CREATE TABLE "holostack"."ai_messages" (
  "id" uuid PRIMARY KEY, "workspace_id" uuid NOT NULL REFERENCES "holostack"."workspaces"("id"),
  "user_id" uuid NOT NULL REFERENCES "holostack"."users"("id"), "project_id" uuid NOT NULL REFERENCES "holostack"."projects"("id"),
  "usage_id" uuid NOT NULL REFERENCES "holostack"."ai_usage_records"("id"), "role" text NOT NULL,
  "content" text NOT NULL, "created_at" timestamptz NOT NULL
);
--> statement-breakpoint
CREATE INDEX "ai_messages_project_time_idx" ON "holostack"."ai_messages" ("project_id", "created_at");
