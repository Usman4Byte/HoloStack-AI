import { createHmac } from "node:crypto";
import { database } from "./fixtures";

export default async function cleanup() {
  const run = process.env.HOLOSTACK_TEST_RUN;
  if (!run || !/^[a-f0-9]{32}$/.test(run) || !process.env.DATABASE_URL) return;
  await database(async pool => {
    const client = await pool.connect();
    try {
      const result = await client.query("SELECT id,email FROM holostack.users WHERE email LIKE $1", [`e2e-${run}-%@example.invalid`]);
      // Only uniquely named synthetic accounts created by this exact browser-test run.
      const ids = result.rows.map(row => row.id);
      const keys = new Set<string>();
      const secret = process.env.AUTH_SECRET;
      const scopes: [string,string,number][] = [["signup-ip", "local:http://localhost:3100", 3600], ["login-ip", "local:http://localhost:3100", 900]];
      for (const row of result.rows) scopes.push(["signup-email", row.email, 3600], ["login-email", row.email, 900], ["project-write", row.id, 60], ["profile", row.id, 60], ["password-change", row.id, 900], ["ai-action", `${row.id}:local:http://localhost:3100`, 60]);
      if (secret) for (const [scope, subject, seconds] of scopes) {
        const window = Math.floor(Date.now() / (seconds * 1000));
        for (let offset = 0; offset <= 10; offset++) keys.add(createHmac("sha256", secret).update(`${scope}:${subject}:${window-offset}`).digest("hex"));
      }
      await client.query("BEGIN");
      if (ids.length) {
        await client.query("DELETE FROM holostack.ai_messages WHERE user_id=ANY($1::uuid[])", [ids]);
        await client.query("DELETE FROM holostack.ai_artifacts WHERE user_id=ANY($1::uuid[])", [ids]);
        await client.query("DELETE FROM holostack.ai_usage_records WHERE user_id=ANY($1::uuid[])", [ids]);
        await client.query("DELETE FROM holostack.intelligence_runs WHERE user_id=ANY($1::uuid[])", [ids]);
        await client.query("DELETE FROM holostack.ai_quota_counters WHERE quota_key=ANY($1::text[])", [ids.map(id => `user:${id}:${new Date().toISOString().slice(0, 10)}`)]);
        await client.query("DELETE FROM holostack.usage_events WHERE user_id=ANY($1::uuid[])", [ids]);
        await client.query("DELETE FROM holostack.architecture_versions WHERE created_by=ANY($1::uuid[])", [ids]);
        await client.query("DELETE FROM holostack.projects WHERE created_by=ANY($1::uuid[])", [ids]);
        await client.query("DELETE FROM holostack.workspace_members WHERE user_id=ANY($1::uuid[])", [ids]);
        await client.query("DELETE FROM holostack.sessions WHERE user_id=ANY($1::uuid[])", [ids]);
        await client.query("DELETE FROM holostack.workspaces WHERE owner_id=ANY($1::uuid[])", [ids]);
        await client.query("DELETE FROM holostack.users WHERE id=ANY($1::uuid[])", [ids]);
      }
      if (keys.size) await client.query("DELETE FROM holostack.rate_limits WHERE key=ANY($1::text[])", [[...keys]]);
      await client.query("COMMIT");
      console.log(`Removed ${ids.length} synthetic test accounts and their private fixtures.`);
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally { client.release(); }
  }).catch(() => { throw new Error("Test cleanup incomplete; inspect only this run's e2e fixture accounts. Database error withheld."); });
}
