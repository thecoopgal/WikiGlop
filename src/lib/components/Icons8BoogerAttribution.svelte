<script lang="ts">
	const platformHomeHref = $derived.by(() => {
		if (typeof window === 'undefined') return 'https://gloopglop.com/';
		const { protocol, hostname, port } = window.location;

		// Local dev: route tenant *.localhost back to localhost root.
		if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === '127.0.0.1') {
			const localHost = hostname === '127.0.0.1' ? '127.0.0.1' : 'localhost';
			const host = port ? `${localHost}:${port}` : localHost;
			return `${protocol}//${host}/`;
		}

		// Tenant domains -> platform apex.
		if (hostname === 'gloop.gg' || hostname.endsWith('.gloop.gg')) return `${protocol}//gloop.gg/`;
		if (hostname === 'gloopglop.com' || hostname.endsWith('.gloopglop.com')) return `${protocol}//gloopglop.com/`;

		// Fallback to current root.
		return `${protocol}//${hostname}/`;
	});
</script>

<footer
	class="mt-auto border-t border-base-300/60 bg-base-100/80 px-4 py-3 text-center text-xs text-base-content/60"
>
	<div class="mb-1">
		Proudly made by the
		<a class="link link-hover" href={platformHomeHref}
			>GloopGlop Cooperative</a
		>
	</div>
	<a
		target="_blank"
		rel="noopener noreferrer"
		class="link link-hover"
		href="https://icons8.com/icon/25888/booger">Booger</a>
	icon by
	<a target="_blank" rel="noopener noreferrer" class="link link-hover" href="https://icons8.com">Icons8</a>
</footer>
