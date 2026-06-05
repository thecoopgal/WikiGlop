export function cssColorToHex(color: string): string {
	const value = color.trim();
	if (!value) return '#000000';
	if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase();
	if (/^#[0-9a-f]{3}$/i.test(value)) {
		const [, r, g, b] = value;
		return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
	}

	const canvas = document.createElement('canvas');
	canvas.width = 1;
	canvas.height = 1;
	const ctx = canvas.getContext('2d');
	if (!ctx) return '#000000';

	ctx.fillStyle = '#000000';
	ctx.fillRect(0, 0, 1, 1);
	ctx.fillStyle = value;
	ctx.fillRect(0, 0, 1, 1);
	const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
	return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

export function normalizeHexColor(value: string): string | null {
	const trimmed = value.trim();
	if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed.toLowerCase();
	if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
		const [, r, g, b] = trimmed;
		return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
	}
	return null;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
	const normalized = normalizeHexColor(hex);
	if (!normalized) return null;
	return {
		r: parseInt(normalized.slice(1, 3), 16),
		g: parseInt(normalized.slice(3, 5), 16),
		b: parseInt(normalized.slice(5, 7), 16)
	};
}

function clampRgbChannel(value: number): number {
	return Math.min(255, Math.max(0, Math.round(value)));
}

export function rgbToHex(r: number, g: number, b: number): string {
	return `#${[clampRgbChannel(r), clampRgbChannel(g), clampRgbChannel(b)]
		.map((channel) => channel.toString(16).padStart(2, '0'))
		.join('')}`;
}
