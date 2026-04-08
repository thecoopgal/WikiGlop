<script lang="ts">
	import IconInstagram from '~icons/mdi/instagram';
	import IconFacebook from '~icons/mdi/facebook';
	import IconYoutube from '~icons/mdi/youtube';
	import IconTiktok from '~icons/simple-icons/tiktok';
	import IconThreadsFallback from '~icons/mdi/at';
	import IconHome from '~icons/mdi/home';
	import IconDocument from '~icons/mdi/file-document-outline';
	import IconUsers from '~icons/mdi/account-group';
	import IconShop from '~icons/mdi/cart-outline';
	import IconCash from '~icons/mdi/cash';
	import IconCoffee from '~icons/mdi/coffee-outline';
	import IconWeb from '~icons/mdi/web';
	import IconLink from '~icons/mdi/link-variant';

	type Props = {
		name?: string;
		tagline?: string;
		avatar?: string;
		bio?: string;
		short_links?: Array<{
			label?: string;
			href: string;
			icon?: string;
			open_in?: 'same_tab' | 'new_tab' | string;
		}>;
	};

	let { name, tagline, avatar, bio, short_links } = $props() as Props;

	const cardShadow = 'shadow-[0px_1px_3px_rgba(0,0,0,0.15)]';

	function normalizeIconKey(value: string | undefined): string {
		return (value ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '');
	}

	function iconComponent(icon: string | undefined) {
		const key = normalizeIconKey(icon);
		switch (key) {
			case 'instagram':
				return IconInstagram;
			case 'facebook':
				return IconFacebook;
			case 'youtube':
			case 'yt':
				return IconYoutube;
			case 'tiktok':
				return IconTiktok;
			case 'threads':
				return IconThreadsFallback;
			case 'home':
				return IconHome;
			case 'document':
			case 'doc':
				return IconDocument;
			case 'users':
			case 'people':
				return IconUsers;
			case 'shop':
			case 'store':
				return IconShop;
			case 'cashapp':
			case 'venmo':
			case 'cash':
				return IconCash;
			case 'kofi':
			case 'coffee':
				return IconCoffee;
			case 'website':
			case 'web':
				return IconWeb;
			default:
				return IconLink;
		}
	}

	function shouldOpenSameTab(openIn: string | undefined): boolean {
		return (openIn ?? '').toLowerCase() === 'same_tab';
	}
</script>

{#if name}
	<section class="my-10">
		<div class="card bg-base-100 {cardShadow}">
			<div class="card-body items-center text-center">
				<div class="flex flex-col items-center gap-4">
					{#if avatar}
						<img
							src={avatar}
							alt={name}
							class="h-16 w-16 rounded-full object-cover"
						/>
					{/if}
					<div class="text-center">
						<h2 class="card-title w-full justify-center text-2xl text-center">{name}</h2>
						{#if tagline}
							<p class="mt-5 opacity-80">{tagline}</p>
						{/if}
					</div>
				</div>
				{#if bio}
					<p class="whitespace-pre-line">{bio}</p>
				{/if}
				{#if short_links?.length}
					<div class="mt-5 flex flex-wrap gap-2">
						{#each short_links as shortLink, i (`${shortLink.href}-${i}`)}
							{@const Icon = iconComponent(shortLink.icon)}
							<a
								href={shortLink.href}
								class="btn btn-circle btn-sm btn-outline {cardShadow}"
								target={shouldOpenSameTab(shortLink.open_in) ? undefined : '_blank'}
								rel={shouldOpenSameTab(shortLink.open_in) ? undefined : 'noreferrer'}
								title={shortLink.label ?? shortLink.icon ?? 'Link'}
								aria-label={shortLink.label ?? shortLink.icon ?? 'Link'}
							>
								<Icon class="h-5 w-5" />
							</a>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</section>
{:else}
	<p class="text-sm text-warning">Creator profile missing name.</p>
{/if}

