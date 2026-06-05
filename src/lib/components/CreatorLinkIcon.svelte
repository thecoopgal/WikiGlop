<script lang="ts">
	import type { Component } from 'svelte';
	import {
		normalizeCreatorLinkIconKey,
		resolveCreatorLinkIconDisplay,
		type CreatorLinkIconDisplay,
		type CreatorLinkIconMode
	} from '$lib/creator-link-icon';
	import IconCash from '~icons/mdi/cash';
	import IconCoffee from '~icons/mdi/coffee-outline';
	import IconDocument from '~icons/mdi/file-document-outline';
	import IconFacebook from '~icons/mdi/facebook';
	import IconHome from '~icons/mdi/home';
	import IconInstagram from '~icons/mdi/instagram';
	import IconLink from '~icons/mdi/link-variant';
	import IconLinkedin from '~icons/mdi/linkedin';
	import IconShop from '~icons/mdi/cart-outline';
	import IconTextBoxOutline from '~icons/mdi/text-box-outline';
	import IconThreads from '~icons/mdi/at';
	import IconUsers from '~icons/mdi/account-group';
	import IconWeb from '~icons/mdi/web';
	import IconYoutube from '~icons/mdi/youtube';
	import IconEtsy from '~icons/simple-icons/etsy';
	import IconPatreon from '~icons/simple-icons/patreon';
	import IconTiktok from '~icons/simple-icons/tiktok';
	import IconTwitch from '~icons/simple-icons/twitch';
	import IconX from '~icons/simple-icons/x';

	let {
		href = '',
		mode = 'basic',
		fallback = 'form',
		class: className = 'h-5 w-5 shrink-0'
	}: {
		href?: string;
		mode?: CreatorLinkIconMode;
		fallback?: 'form' | 'link';
		class?: string;
	} = $props();

	let imageFailed = $state(false);

	const display = $derived.by((): CreatorLinkIconDisplay | null => {
		imageFailed;
		return resolveCreatorLinkIconDisplay(href, mode);
	});

	const FallbackIcon = $derived(fallback === 'form' ? IconTextBoxOutline : IconLink);

	function iconComponent(icon: string): Component {
		const key = normalizeCreatorLinkIconKey(icon);
		switch (key) {
			case 'instagram':
				return IconInstagram;
			case 'linkedin':
				return IconLinkedin;
			case 'facebook':
				return IconFacebook;
			case 'youtube':
			case 'yt':
				return IconYoutube;
			case 'tiktok':
				return IconTiktok;
			case 'threads':
				return IconThreads;
			case 'twitter':
				return IconX;
			case 'twitch':
				return IconTwitch;
			case 'patreon':
				return IconPatreon;
			case 'etsy':
				return IconEtsy;
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

	function onImageError() {
		imageFailed = true;
	}

	$effect(() => {
		href;
		mode;
		imageFailed = false;
	});
</script>

{#if display?.kind === 'brand'}
	{@const Icon = iconComponent(display.key)}
	<Icon class="{className} text-base-content/80" aria-hidden="true" />
{:else if display?.kind === 'image' && !imageFailed}
	<img
		src={display.url}
		alt=""
		class="{className} rounded object-cover"
		width="20"
		height="20"
		decoding="async"
		onerror={onImageError}
	/>
{:else if display?.kind === 'image' && imageFailed}
	{@const Icon = iconComponent('link')}
	<Icon class="{className} text-base-content/60" aria-hidden="true" />
{:else if display?.kind !== 'none'}
	<FallbackIcon class="{className} text-base-content/60" aria-hidden="true" />
{/if}
