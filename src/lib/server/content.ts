import fs from 'fs/promises';
import path from 'path';
import { parse as parseYaml } from 'yaml';
import type { ResolvedSite } from './sites';
import { getAllSites } from './sites';

export type PageSeo = {
	title?: string;
	description?: string;
	image?: string;
	[key: string]: unknown;
};

export type PageSettings = {
	max_width?: string;
	table_of_contents?: boolean;
	show_last_updated?: boolean;
	show_edit_history?: boolean;
	show_footer?: boolean;
	show_header?: boolean;
	modal_size?: 'sm' | 'md' | 'lg' | 'xl' | string;
	[key: string]: unknown;
};

export type PageFormField = {
	type: string;
	name: string;
	label?: string;
	required?: boolean;
	placeholder?: string;
	rows?: number;
	options?: Array<{ label: string; value: string }>;
	value?: unknown;
	[key: string]: unknown;
};

export type PageForm = {
	id: string;
	title?: string;
	intro?: string;
	submit_label?: string;
	cancel_label?: string;
	success_message?: string;
	destination?: string;
	notify_roles?: string[];
	fields?: PageFormField[];
	[key: string]: unknown;
};

export type PageBlock = {
	type: string;
	id?: string;
	[key: string]: unknown;
};

export type PageYaml = {
	id: string;
	title?: string;
	path?: string;
	layout: string;
	render_mode?: 'modal' | string;
	seo?: PageSeo;
	blocks?: PageBlock[];
	form?: PageForm;
	// page_settings and other metadata come directly from YAML.
	page_settings?: PageSettings;
	permissions?: Record<string, unknown>;
	[key: string]: unknown;
};

export type LoadedPage = {
	site: ResolvedSite;
	page: PageYaml;
};

type LinkLikeItem = {
	label?: string;
	href?: string;
	type?: string;
	source?: string;
	[key: string]: unknown;
};

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null;
}

function getContentSitesDir() {
	// File: src/lib/server/content.ts -> project root is ../../..
	const projectRoot = path.resolve(import.meta.dirname, '../../..');
	return path.join(projectRoot, 'content', 'sites');
}

function getSitePagesDir(siteId: string) {
	return path.join(getContentSitesDir(), siteId, 'pages');
}

function getSiteModalsDir(siteId: string) {
	return path.join(getContentSitesDir(), siteId, 'modals');
}

function getPageYamlPath(siteId: string, slugParts: string[]): string | null {
	if (slugParts.length === 0) return path.join(getSitePagesDir(siteId), 'index.yaml');
	if (slugParts.length === 1) return path.join(getSitePagesDir(siteId), `${slugParts[0]}.yaml`);

	// Nested pages will be supported later.
	return null;
}

async function readFileSafe(filePath: string): Promise<string | null> {
	try {
		return await fs.readFile(filePath, 'utf8');
	} catch {
		return null;
	}
}

function toPathFromFileName(fileName: string): string {
	const slug = fileName.replace(/\.yaml$/i, '');
	return slug === 'index' ? '/' : `/${slug}`;
}

function toNormalizedPath(pathValue: unknown, fileName: string): string {
	if (typeof pathValue === 'string' && pathValue.trim()) {
		return pathValue.startsWith('/') ? pathValue : `/${pathValue}`;
	}
	return toPathFromFileName(fileName);
}

function isCreatorLinksShortcut(item: LinkLikeItem): boolean {
	const href = typeof item.href === 'string' ? item.href.trim().toLowerCase() : '';
	const type = typeof item.type === 'string' ? item.type.trim().toLowerCase() : '';
	const source = typeof item.source === 'string' ? item.source.trim().toLowerCase() : '';
	return href === '@creator_links' || type === 'creator_links' || source === 'creator_links';
}

function isLocalLikeHost(hostname: string): boolean {
	return hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === '127.0.0.1';
}

function domainSuffix(hostname: string): string | null {
	const parts = hostname.split('.').filter(Boolean);
	if (parts.length < 2) return null;
	// Keep full apex domains like gloopglop.com. For subdomains, strip only the first label.
	return parts.length === 2 ? hostname : parts.slice(1).join('.');
}

function pickHostForRequest(targetSite: ResolvedSite, requestHostname: string): string | null {
	const hosts = (targetSite.hosts ?? []).map((h) => h.trim().toLowerCase()).filter(Boolean);
	if (!hosts.length) return null;

	if (isLocalLikeHost(requestHostname)) {
		return (
			hosts.find((h) => h.endsWith('.localhost')) ??
			hosts.find((h) => h === 'localhost' || h === '127.0.0.1') ??
			hosts[0]
		);
	}

	const suffix = domainSuffix(requestHostname);
	if (suffix) {
		const bySuffix = hosts.find((h) => h === suffix || h.endsWith(`.${suffix}`));
		if (bySuffix) return bySuffix;
	}

	return hosts[0];
}

function buildAbsoluteUrl(host: string, requestUrl: URL): string {
	const needsPort = requestUrl.port && isLocalLikeHost(host);
	const portPart = needsPort ? `:${requestUrl.port}` : '';
	return `${requestUrl.protocol}//${host}${portPart}`;
}

function parsePageYaml(raw: string, filePathForError: string): PageYaml {
	const parsed = parseYaml(raw);
	if (!isRecord(parsed)) throw new Error(`Invalid YAML structure in ${filePathForError}`);

	const layout = parsed.layout;
	const id = parsed.id;
	if (typeof layout !== 'string' || !layout.trim()) {
		throw new Error(`Missing required field "layout" in ${filePathForError}`);
	}
	if (typeof id !== 'string' || !id.trim()) {
		throw new Error(`Missing required field "id" in ${filePathForError}`);
	}

	const page: PageYaml = {
		id,
		title: typeof parsed.title === 'string' ? parsed.title : undefined,
		path: typeof parsed.path === 'string' ? parsed.path : undefined,
		layout: layout.trim(),
		render_mode: typeof parsed.render_mode === 'string' ? parsed.render_mode : undefined,
		seo: isRecord(parsed.seo) ? (parsed.seo as PageSeo) : undefined,
		page_settings: isRecord(parsed.page_settings) ? (parsed.page_settings as PageSettings) : undefined,
		permissions: isRecord(parsed.permissions) ? (parsed.permissions as Record<string, unknown>) : undefined,
	};

	if (Array.isArray(parsed.blocks)) {
		page.blocks = parsed.blocks
			.filter((b) => isRecord(b) && typeof (b as any).type === 'string')
			.map((b) => b as PageBlock);
	}

	if (isRecord(parsed.form)) {
		const f = parsed.form;
		if (typeof f.id === 'string' && f.id.trim().length) {
			page.form = {
				...f,
				id: f.id
			} as PageForm;
		}
	}

	// Fields for form pages live at top-level in YAML.
	if (Array.isArray(parsed.fields)) {
		page.form = {
			...(page.form ?? ({} as PageForm)),
			fields: parsed.fields.filter((x) => isRecord(x) && typeof x.type === 'string' && typeof x.name === 'string')
		} as PageForm;
	}

	return page;
}

export async function loadModalYaml(
	site: ResolvedSite,
	modalId: string
): Promise<PageYaml | null> {
	const safeId = modalId.trim();
	if (!safeId) return null;

	const filePath = path.join(getSiteModalsDir(site.siteId), `${safeId}.yaml`);
	const raw = await readFileSafe(filePath);
	if (!raw || !raw.trim()) return null;

	try {
		return parsePageYaml(raw, filePath);
	} catch (e) {
		throw new Error(e instanceof Error ? e.message : `Invalid modal YAML in ${filePath}`);
	}
}

export async function loadAllModals(site: ResolvedSite): Promise<Record<string, PageYaml>> {
	const modalsDir = getSiteModalsDir(site.siteId);
	let entries: Array<{ name: string; isFile(): boolean }>;
	try {
		entries = await fs.readdir(modalsDir, { withFileTypes: true });
	} catch {
		return {};
	}

	const out: Record<string, PageYaml> = {};
	for (const entry of entries) {
		if (!entry.isFile() || !entry.name.endsWith('.yaml')) continue;
		const modalId = entry.name.replace(/\.yaml$/i, '');
		// eslint-disable-next-line no-await-in-loop
		const modal = await loadModalYaml(site, modalId);
		if (!modal) continue;
		out[modalId] = modal;
	}
	return out;
}

export async function loadPageYaml(
	site: ResolvedSite,
	slugParts: string[]
): Promise<PageYaml | null> {
	const filePath = getPageYamlPath(site.siteId, slugParts);
	if (!filePath) return null;

	const raw = await readFileSafe(filePath);
	if (!raw || !raw.trim()) return null;

	try {
		return parsePageYaml(raw, filePath);
	} catch (e) {
		// For invalid YAML, fail gracefully per-request; loader can surface a useful error.
		throw new Error(e instanceof Error ? e.message : `Invalid page YAML in ${filePath}`);
	}
}

export async function expandCreatorLinksShortcuts(
	site: ResolvedSite,
	page: PageYaml,
	requestUrl: URL
): Promise<PageYaml> {
	if (!Array.isArray(page.blocks) || page.blocks.length === 0) return page;

	const pagesDir = getSitePagesDir(site.siteId);
	let entries: Array<{ name: string; isFile(): boolean }>;
	try {
		entries = await fs.readdir(pagesDir, { withFileTypes: true });
	} catch {
		return page;
	}

	const creatorItems: Array<{ label: string; href: string }> = [];
	for (const entry of entries) {
		if (!entry.isFile() || !entry.name.endsWith('.yaml')) continue;
		const filePath = path.join(pagesDir, entry.name);
		// eslint-disable-next-line no-await-in-loop
		const raw = await readFileSafe(filePath);
		if (!raw || !raw.trim()) continue;

		let parsed: unknown;
		try {
			parsed = parseYaml(raw);
		} catch {
			continue;
		}
		if (!isRecord(parsed)) continue;
		if (typeof parsed.layout !== 'string' || parsed.layout.trim() !== 'creator_links') continue;

		const label =
			typeof parsed.title === 'string' && parsed.title.trim()
				? parsed.title.trim()
				: typeof parsed.id === 'string' && parsed.id.trim()
					? parsed.id.trim()
					: entry.name.replace(/\.yaml$/i, '');
		const href = toNormalizedPath(parsed.path, entry.name);
		creatorItems.push({ label, href });
	}

	const uniqueCreatorItems = creatorItems.filter(
		(item, i, arr) => arr.findIndex((x) => x.href === item.href) === i
	);
	const allSites = await getAllSites();

	const nextBlocks = page.blocks.map((block) => {
		if (block.type !== 'links' || !Array.isArray(block.items)) return block;
		const items = block.items as LinkLikeItem[];
		let hasExpansion = false;
		const expandedItems: Array<Record<string, unknown>> = [];

		for (const item of items) {
			const sourceRaw = typeof item.source === 'string' ? item.source.trim() : '';
			if (sourceRaw.startsWith('@') && sourceRaw.length > 1) {
				const requestedSiteId = sourceRaw.slice(1).trim().toLowerCase();
				const targetSite = allSites.find(
					(s) => s.siteId.toLowerCase() === requestedSiteId || s.id.toLowerCase() === requestedSiteId
				);
				if (targetSite) {
					const host = pickHostForRequest(targetSite, requestUrl.hostname.toLowerCase());
					if (host) {
						hasExpansion = true;
						expandedItems.push({
							...item,
							label: typeof item.label === 'string' && item.label.trim() ? item.label : targetSite.name ?? targetSite.id,
							href: buildAbsoluteUrl(host, requestUrl)
						});
						continue;
					}
				}
				// Graceful fallback for missing/invalid site references.
				hasExpansion = true;
				expandedItems.push({
					...item,
					label:
						typeof item.label === 'string' && item.label.trim()
							? item.label
							: sourceRaw.slice(1),
					href: '',
					status: 'not_found',
					message: 'Page not found'
				});
				continue;
			}

			if (isCreatorLinksShortcut(item)) {
				hasExpansion = true;
				for (const creatorItem of uniqueCreatorItems) expandedItems.push(creatorItem);
			} else {
				expandedItems.push(item as Record<string, unknown>);
			}
		}

		return hasExpansion ? { ...block, items: expandedItems } : block;
	});

	return { ...page, blocks: nextBlocks };
}

