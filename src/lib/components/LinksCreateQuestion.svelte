<script lang="ts">

	import {

		THEME_PROMPT_DELAY_MS,

		THEME_PROMPT_FADE_MS

	} from '$lib/links-create-theme-timing';

	import {

		LINKS_CREATE_HEADLINES,

		type LinksCreateStep

	} from '$lib/links-create-steps';



	let { step }: { step: LinksCreateStep } = $props();



	let showSplitPrompt = $state(false);



	const splitHeadline = $derived.by(() => {

		if (step === 'theme') {

			return { lead: 'First,', prompt: 'Select your theme' };

		}

		if (step === 'name') {
			return { lead: 'Next,', prompt: 'What is your name?' };
		}
		if (step === 'tagline') {
			return { lead: 'Now,', prompt: "What's your tagline?" };
		}
		if (step === 'description') {
			return { lead: 'Give me,', prompt: 'your page description' };
		}
		if (step === 'links') {
			return { lead: "Let's add,", prompt: 'your links!' };
		}
		if (step === 'photo') {
			return { lead: 'Smile,', prompt: 'set your profile picture' };
		}
		if (step === 'almost-done') {
			return { lead: 'Nice,', prompt: 'almost done' };
		}
		if (step === 'customize') {
			return { lead: 'Customize,', prompt: 'your GloopGlop Page' };
		}
		return null;

	});



	$effect(() => {

		if (!splitHeadline) {

			showSplitPrompt = false;

			return;

		}



		showSplitPrompt = false;

		const promptTimer = window.setTimeout(() => {

			showSplitPrompt = true;

		}, THEME_PROMPT_DELAY_MS);



		return () => window.clearTimeout(promptTimer);

	});

</script>



{#if splitHeadline}

	<h1 class="w-full text-center text-3xl font-extrabold tracking-tight sm:text-4xl">

		<span class="inline-grid [&>*]:col-start-1 [&>*]:row-start-1">

			<span

				class="invisible inline-flex max-sm:flex-col max-sm:items-center max-sm:gap-y-1 sm:flex-row sm:items-baseline sm:gap-x-2 sm:whitespace-nowrap"

				aria-hidden="true"

			>

				<span>{splitHeadline.lead}</span>

				<span class="text-primary">{splitHeadline.prompt}</span>

			</span>

			<span
				class="inline-flex max-sm:flex-col max-sm:items-center max-sm:gap-y-1 sm:flex-row sm:items-baseline sm:gap-x-2 sm:whitespace-nowrap"
			>

				<span>{splitHeadline.lead}</span>

				<span

					class="text-primary transition-opacity ease-out {showSplitPrompt ? 'opacity-100' : 'opacity-0'}"

					style="transition-duration: {THEME_PROMPT_FADE_MS}ms"

					aria-hidden={!showSplitPrompt}

				>

					{splitHeadline.prompt}

				</span>

			</span>

		</span>

	</h1>

{:else}

	<h1

		class="w-full text-center text-3xl font-extrabold tracking-tight sm:text-4xl {step === 'gloops'

			? 'whitespace-nowrap'

			: ''}"

	>

		{LINKS_CREATE_HEADLINES[step]}

	</h1>

{/if}

