CREATE SCHEMA "holostack";
--> statement-breakpoint
CREATE TABLE "holostack"."users" (
  "id" uuid PRIMARY KEY, "email" text NOT NULL UNIQUE, "name" text NOT NULL,
  "password_hash" text NOT NULL, "created_at" timestamptz NOT NULL
);
--> statement-breakpoint
CREATE TABLE "holostack"."sessions" (
  "token_hash" text PRIMARY KEY, "user_id" uuid NOT NULL REFERENCES "holostack"."users"("id"),
  "expires_at" timestamptz NOT NULL, "created_at" timestamptz NOT NULL
);
--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "holostack"."sessions" ("user_id");
--> statement-breakpoint
CREATE INDEX "sessions_expiry_idx" ON "holostack"."sessions" ("expires_at");
--> statement-breakpoint
CREATE TABLE "holostack"."workspaces" (
  "id" uuid PRIMARY KEY, "owner_id" uuid NOT NULL UNIQUE REFERENCES "holostack"."users"("id"),
  "name" text NOT NULL, "project_slots" integer NOT NULL, "created_at" timestamptz NOT NULL
);
--> statement-breakpoint
CREATE TABLE "holostack"."workspace_members" (
  "workspace_id" uuid NOT NULL REFERENCES "holostack"."workspaces"("id"),
  "user_id" uuid NOT NULL REFERENCES "holostack"."users"("id"), "role" text NOT NULL,
  PRIMARY KEY ("workspace_id", "user_id")
);
--> statement-breakpoint
CREATE INDEX "members_user_idx" ON "holostack"."workspace_members" ("user_id");
--> statement-breakpoint
CREATE TABLE "holostack"."projects" (
  "id" uuid PRIMARY KEY, "workspace_id" uuid NOT NULL REFERENCES "holostack"."workspaces"("id"),
  "created_by" uuid NOT NULL REFERENCES "holostack"."users"("id"),
  "name" text NOT NULL, "description" text NOT NULL, "notes" text NOT NULL, "graph" jsonb NOT NULL,
  "revision" integer NOT NULL, "status" text NOT NULL, "template_id" text NOT NULL,
  "created_at" timestamptz NOT NULL, "updated_at" timestamptz NOT NULL
);
--> statement-breakpoint
CREATE INDEX "projects_workspace_status_idx" ON "holostack"."projects" ("workspace_id", "status", "updated_at");
--> statement-breakpoint
CREATE TABLE "holostack"."architecture_versions" (
  "id" uuid PRIMARY KEY, "project_id" uuid NOT NULL REFERENCES "holostack"."projects"("id"),
  "workspace_id" uuid NOT NULL REFERENCES "holostack"."workspaces"("id"),
  "created_by" uuid NOT NULL REFERENCES "holostack"."users"("id"), "revision" integer NOT NULL,
  "name" text NOT NULL, "description" text NOT NULL, "notes" text NOT NULL, "graph" jsonb NOT NULL,
  "change" text NOT NULL, "created_at" timestamptz NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "versions_project_revision_idx" ON "holostack"."architecture_versions" ("project_id", "revision");
--> statement-breakpoint
CREATE TABLE "holostack"."rate_limits" ("key" text PRIMARY KEY, "attempts" integer NOT NULL, "expires_at" timestamptz NOT NULL);
--> statement-breakpoint
CREATE INDEX "rate_expiry_idx" ON "holostack"."rate_limits" ("expires_at");
--> statement-breakpoint
CREATE TABLE "holostack"."usage_events" (
  "id" uuid PRIMARY KEY, "workspace_id" uuid NOT NULL REFERENCES "holostack"."workspaces"("id"),
  "user_id" uuid NOT NULL REFERENCES "holostack"."users"("id"), "kind" text NOT NULL, "created_at" timestamptz NOT NULL
);
--> statement-breakpoint
CREATE INDEX "usage_workspace_idx" ON "holostack"."usage_events" ("workspace_id", "created_at");
