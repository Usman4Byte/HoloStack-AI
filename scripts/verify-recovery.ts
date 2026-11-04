import "./env";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { templates } from "../src/domain/architecture/templates";
import { verifiedMigrationInputs } from "./migration-helpers";
import { safeDatabaseError } from "../src/server/db/config";

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, canonical(item)]));
  return value;
}
const rowHash = (value: unknown) => createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
const tables = ["intelligence_runs", "ai_messages", "ai_artifacts", "ai_usage_records", "ai_quota_counters", "usage_events", "architecture_versions", "projects", "workspace_members", "sessions", "workspaces", "users", "rate_limits", "migration_ledger"];

async function main() {
  const input = await verifiedMigrationInputs();
  const sourceSchema = `holostack_recovery_src_${randomUUID().replaceAll("-", "")}`;
  const restoreSchema = `holostack_recovery_dst_${randomUUID().replaceAll("-", "")}`;
  const schemas = [sourceSchema, restoreSchema];
  let pool: Pool | undefined;
  let passed = false;
  let stage = "prepare recovery inputs";
  let counts = { users: 0, workspaces: 0, projects: 0, versions: 0, scenarios: 0 };
  let graphHash = "";
  try {
    for (const schema of schemas) {
      stage = `prepare isolated schema ${schema.includes("_src_") ? "source" : "restore"}`;
      const folder = `.local/${schema}`;
      await mkdir(`${folder}/meta`, { recursive: true });
      await writeFile(`${folder}/meta/_journal.json`, input.journal);
      for (const file of input.files) {
        const scoped = file.sql.replaceAll('"holostack"', `"${schema}"`).replace(`CREATE SCHEMA "${schema}";`, `CREATE SCHEMA IF NOT EXISTS "${schema}";`);
        await writeFile(`${folder}/${file.tag}.sql`, scoped);
      }
    }
    pool = new Pool(input.config); pool.on("error", () => {});
    for (const schema of schemas) {
      stage = `apply exact migrations to isolated ${schema.includes("_src_") ? "source" : "restore"} schema`;
      await migrate(drizzle(pool), { migrationsFolder: `.local/${schema}`, migrationsSchema: schema, migrationsTable: "migration_ledger" });
    }

    stage = "create synthetic source records";
    const userId = randomUUID(), workspaceId = randomUUID(), projectId = randomUUID(), versionId = randomUUID(), runId = randomUUID();
    const createdAt = new Date(), iso = createdAt.toISOString();
    const graph = structuredClone(templates[0]);
    graph.id = projectId; graph.name = "Synthetic recovery rehearsal"; graph.version = 1; graph.createdAt = iso;
    const workload = { requestsPerSecond: 60, concurrentUsers: 900, requestsPerUserPerMinute: 4, readShare: 0.75 };
    const capacity = { offeredRps: 60, note: "Synthetic recovery fixture; no live capacity measurement." };
    const findings = [{ id: "fixture-only", severity: "low", evidence: ["Generated fixture"] }];

    await pool.query(`INSERT INTO ${sourceSchema}.users (id,email,name,password_hash,created_at) VALUES ($1,$2,$3,$4,$5)`, [userId, `recovery-${randomUUID()}@example.invalid`, "Synthetic Recovery", "synthetic-only-placeholder-not-a-login", createdAt]);
    await pool.query(`INSERT INTO ${sourceSchema}.workspaces (id,owner_id,name,project_slots,created_at) VALUES ($1,$2,$3,0,$4)`, [workspaceId, userId, "Synthetic Recovery Workspace", createdAt]);
    await pool.query(`INSERT INTO ${sourceSchema}.workspace_members (workspace_id,user_id,role) VALUES ($1,$2,'owner')`, [workspaceId, userId]);
    await pool.query(`INSERT INTO ${sourceSchema}.projects (id,workspace_id,created_by,name,description,notes,graph,revision,status,template_id,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,1,'active',$8,$9,$9)`, [projectId, workspaceId, userId, graph.name, graph.description, "Synthetic recovery rehearsal only.", JSON.stringify(graph), "ai-saas", createdAt]);
    await pool.query(`INSERT INTO ${sourceSchema}.architecture_versions (id,project_id,workspace_id,created_by,revision,name,description,notes,graph,change,created_at) VALUES ($1,$2,$3,$4,1,$5,$6,$7,$8::jsonb,'created',$9)`, [versionId, projectId, workspaceId, userId, graph.name, graph.description, "Synthetic recovery rehearsal only.", JSON.stringify(graph), createdAt]);
    await pool.query(`INSERT INTO ${sourceSchema}.intelligence_runs (id,workspace_id,user_id,project_id,graph_revision,name,workload,capacity,findings,created_at) VALUES ($1,$2,$3,$4,1,'Synthetic recovery scenario',$5::jsonb,$6::jsonb,$7::jsonb,$8)`, [runId, workspaceId, userId, projectId, JSON.stringify(workload), JSON.stringify(capacity), JSON.stringify(findings), createdAt]);

    // Export only this random synthetic user, workspace, project, history, and scenario.
    stage = "export the synthetic tenant bundle";
    const bundle = {
      users: (await pool.query(`SELECT id,email,name,password_hash,created_at FROM ${sourceSchema}.users WHERE id=$1`, [userId])).rows,
      workspaces: (await pool.query(`SELECT id,owner_id,name,project_slots,created_at FROM ${sourceSchema}.workspaces WHERE id=$1`, [workspaceId])).rows,
      members: (await pool.query(`SELECT workspace_id,user_id,role FROM ${sourceSchema}.workspace_members WHERE workspace_id=$1`, [workspaceId])).rows,
      projects: (await pool.query(`SELECT id,workspace_id,created_by,name,description,notes,graph,revision,status,template_id,created_at,updated_at FROM ${sourceSchema}.projects WHERE id=$1`, [projectId])).rows,
      versions: (await pool.query(`SELECT id,project_id,workspace_id,created_by,revision,name,description,notes,graph,change,created_at FROM ${sourceSchema}.architecture_versions WHERE project_id=$1`, [projectId])).rows,
      scenarios: (await pool.query(`SELECT id,workspace_id,user_id,project_id,graph_revision,name,workload,capacity,findings,created_at FROM ${sourceSchema}.intelligence_runs WHERE project_id=$1`, [projectId])).rows,
    };
    counts = { users: bundle.users.length, workspaces: bundle.workspaces.length, projects: bundle.projects.length, versions: bundle.versions.length, scenarios: bundle.scenarios.length };
    if (counts.users !== 1 || counts.workspaces !== 1 || counts.projects !== 1 || counts.versions !== 1 || counts.scenarios !== 1) throw new Error("Synthetic export fixture count mismatch.");

    stage = "restore the synthetic tenant bundle";
    const user = bundle.users[0], workspace = bundle.workspaces[0], project = bundle.projects[0];
    await pool.query(`INSERT INTO ${restoreSchema}.users (id,email,name,password_hash,created_at) VALUES ($1,$2,$3,$4,$5)`, [user.id, user.email, user.name, user.password_hash, user.created_at]);
    await pool.query(`INSERT INTO ${restoreSchema}.workspaces (id,owner_id,name,project_slots,created_at) VALUES ($1,$2,$3,$4,$5)`, [workspace.id, workspace.owner_id, workspace.name, workspace.project_slots, workspace.created_at]);
    for (const member of bundle.members) await pool.query(`INSERT INTO ${restoreSchema}.workspace_members (workspace_id,user_id,role) VALUES ($1,$2,$3)`, [member.workspace_id, member.user_id, member.role]);
    await pool.query(`INSERT INTO ${restoreSchema}.projects (id,workspace_id,created_by,name,description,notes,graph,revision,status,template_id,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12)`, [project.id, project.workspace_id, project.created_by, project.name, project.description, project.notes, JSON.stringify(project.graph), project.revision, project.status, project.template_id, project.created_at, project.updated_at]);
    for (const version of bundle.versions) await pool.query(`INSERT INTO ${restoreSchema}.architecture_versions (id,project_id,workspace_id,created_by,revision,name,description,notes,graph,change,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11)`, [version.id, version.project_id, version.workspace_id, version.created_by, version.revision, version.name, version.description, version.notes, JSON.stringify(version.graph), version.change, version.created_at]);
    for (const scenario of bundle.scenarios) await pool.query(`INSERT INTO ${restoreSchema}.intelligence_runs (id,workspace_id,user_id,project_id,graph_revision,name,workload,capacity,findings,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10)`, [scenario.id, scenario.workspace_id, scenario.user_id, scenario.project_id, scenario.graph_revision, scenario.name, JSON.stringify(scenario.workload), JSON.stringify(scenario.capacity), JSON.stringify(scenario.findings), scenario.created_at]);

    stage = "verify restored graph, scenario content, and relationships";
    const [originalGraph] = (await pool.query(`SELECT graph FROM ${sourceSchema}.projects WHERE id=$1`, [projectId])).rows;
    const [restoredGraph] = (await pool.query(`SELECT graph FROM ${restoreSchema}.projects WHERE id=$1`, [projectId])).rows;
    const [restoredScenario] = (await pool.query(`SELECT workload,capacity,findings FROM ${restoreSchema}.intelligence_runs WHERE id=$1`, [runId])).rows;
    const linked = await pool.query(`SELECT COUNT(*) AS count FROM ${restoreSchema}.projects p JOIN ${restoreSchema}.workspaces w ON w.id=p.workspace_id JOIN ${restoreSchema}.users u ON u.id=p.created_by JOIN ${restoreSchema}.architecture_versions v ON v.project_id=p.id JOIN ${restoreSchema}.intelligence_runs r ON r.project_id=p.id WHERE p.id=$1`, [projectId]);
    stage = "verify restored architecture JSON hash";
    if (rowHash(originalGraph.graph) !== rowHash(restoredGraph.graph)) throw Object.assign(new Error("Synthetic architecture JSON changed during restore."), { code: "RECOVERY_GRAPH_HASH_MISMATCH" });
    stage = "verify restored scenario JSON hash";
    if (rowHash({ workload: restoredScenario.workload, capacity: restoredScenario.capacity, findings: restoredScenario.findings }) !== rowHash({ workload, capacity, findings })) throw Object.assign(new Error("Synthetic scenario JSON changed during restore."), { code: "RECOVERY_SCENARIO_HASH_MISMATCH" });
    stage = "verify restored foreign-key relationship joins";
    if (Number(linked.rows[0]?.count) !== 1) throw Object.assign(new Error("Synthetic relationship join did not match."), { code: "RECOVERY_RELATIONSHIP_MISMATCH" });
    graphHash = rowHash(restoredGraph.graph);
    passed = true;
    console.log("PASS: synthetic project, workspace ownership, architecture history, and saved scenario exported from one isolated TiDB schema, restored to a second, and verified by JSON hashes and joins.");
  } catch (error) {
    const name = error instanceof Error ? error.name.replace(/[^A-Za-z0-9_]/g, "").slice(0, 48) : "UnknownError";
    const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" && /^[A-Z0-9_]{2,40}$/.test(error.code) ? error.code : "UNCLASSIFIED";
    console.error(`Recovery rehearsal failed during ${stage} (${name}, ${code}). ${safeDatabaseError(error)}`);
  } finally {
    if (pool) {
      for (const schema of schemas) {
        try {
          for (const table of tables) await pool.query(`DROP TABLE IF EXISTS ${schema}.${table}`);
          await pool.query(`DROP SCHEMA IF EXISTS ${schema}`);
        } catch { passed = false; console.error("Cleanup incomplete for a generated recovery schema."); }
      }
      await pool.end();
    }
    await writeFile(".local/recovery-verification.json", JSON.stringify({ passed, checkedAt: new Date().toISOString(), targetFingerprint: input.fingerprint, migrationHash: input.migrationHash, counts, graphHash, scope: "Synthetic fixture only; no account data or production backup was read." }, null, 2));
    if (!passed) process.exitCode = 1;
  }
}
main().catch(error => { console.error(`Recovery rehearsal could not start. ${safeDatabaseError(error)}`); process.exitCode = 1; });
