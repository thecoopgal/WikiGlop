import { readFileSync, writeFileSync } from 'fs';
import { parse } from 'yaml';
import { execSync } from 'child_process';

const site = parse(readFileSync('content/sites/thecoopgal/site.yaml', 'utf8'));
const page = parse(readFileSync('content/sites/thecoopgal/pages/index.yaml', 'utf8'));
const siteId = 'thecoopgal';
const userId = 'usr_1bdc4a4c4c999bc29b9a71f7';

function sqlStr(value) {
	return `'${String(value).replace(/'/g, "''")}'`;
}

const configJson = JSON.stringify(site);
const pageJson = JSON.stringify(page);
const hosts = Array.isArray(site.hosts) ? site.hosts : [];

const statements = [
	`INSERT INTO content_sites (id, name, owner_user_id, status, config_json, source, source_ref)
   VALUES (${sqlStr(siteId)}, ${sqlStr(site.name ?? siteId)}, NULL, 'published', ${sqlStr(configJson)}, 'yaml_import', 'content/sites/thecoopgal')
   ON CONFLICT(id) DO UPDATE SET
     name = excluded.name,
     status = 'published',
     config_json = excluded.config_json,
     source = excluded.source,
     source_ref = excluded.source_ref,
     updated_at = datetime('now');`,
	`DELETE FROM content_site_hosts WHERE site_id = ${sqlStr(siteId)};`,
	...hosts.map(
		(h) =>
			`INSERT INTO content_site_hosts (hostname, site_id) VALUES (${sqlStr(String(h).toLowerCase())}, ${sqlStr(siteId)})
     ON CONFLICT(hostname) DO UPDATE SET site_id = excluded.site_id;`
	),
	`INSERT INTO content_pages (id, site_id, slug, path, page_json, status)
   VALUES ('pg_thecoopgal_index', ${sqlStr(siteId)}, 'index', '/', ${sqlStr(pageJson)}, 'published')
   ON CONFLICT(site_id, slug) DO UPDATE SET
     path = excluded.path,
     page_json = excluded.page_json,
     status = 'published',
     updated_at = datetime('now');`,
	`INSERT INTO content_site_members (site_id, user_id, role)
   VALUES (${sqlStr(siteId)}, ${sqlStr(userId)}, 'owner')
   ON CONFLICT(site_id, user_id) DO UPDATE SET role = 'owner', updated_at = datetime('now');`
];

const sqlPath = '.tmp-seed-thecoopgal.sql';
writeFileSync(sqlPath, statements.join('\n'));

execSync(`npx wrangler d1 execute gloopglop --local --file=${sqlPath}`, {
	stdio: 'inherit'
});

console.log('Seeded thecoopgal and set thecoopgal@gmail.com as owner.');
