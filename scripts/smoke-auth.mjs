/**
 * Smoke-check: admin APIs return 401/403 without a session.
 * Public APIs must remain reachable.
 *
 * Usage:
 *   npm run smoke:auth
 *   SMOKE_BASE_URL=https://your-site.netlify.app npm run smoke:auth
 */

const BASE = (process.env.SMOKE_BASE_URL || "http://localhost:4000").replace(
  /\/$/,
  "",
);

const ADMIN_PATHS = [
  "/api/dashboard",
  "/api/users",
  "/api/members",
  "/api/groups",
  "/api/players",
  "/api/teams/board",
  "/api/behaviors",
  "/api/reports",
  "/api/items",
  "/api/safes",
  "/api/set-dates",
  "/api/check-events",
];

const PUBLIC_PATHS = ["/api/public/report-options", "/report", "/login"];

async function check(path, expectAuthBlocked) {
  const res = await fetch(`${BASE}${path}`, {
    method: "GET",
    redirect: "manual",
    headers: { Accept: "application/json, text/html" },
  });

  if (expectAuthBlocked) {
    const ok =
      res.status === 401 ||
      res.status === 403 ||
      res.status === 307 ||
      res.status === 302;
    return {
      path,
      status: res.status,
      ok,
      note: ok ? "blocked" : "EXPECTED 401/403/redirect",
    };
  }

  const ok = res.status >= 200 && res.status < 400;
  return {
    path,
    status: res.status,
    ok,
    note: ok ? "ok" : "EXPECTED 2xx/3xx",
  };
}

async function main() {
  console.log(`smoke:auth → ${BASE}`);
  const results = [];

  for (const path of ADMIN_PATHS) {
    results.push(await check(path, true));
  }
  for (const path of PUBLIC_PATHS) {
    results.push(await check(path, false));
  }

  let failed = 0;
  for (const row of results) {
    const mark = row.ok ? "PASS" : "FAIL";
    if (!row.ok) failed += 1;
    console.log(`${mark}  ${row.status}  ${row.path}  (${row.note})`);
  }

  if (failed > 0) {
    console.error(`\n${failed} check(s) failed`);
    process.exit(1);
  }
  console.log(`\nAll ${results.length} checks passed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
