<script lang="ts">



	import { getContext } from 'svelte';



	import { fade } from 'svelte/transition';



	import { goto } from '$app/navigation';



	import {



		isValidLinksCreatorPageDescription,
		isValidLinksCreatorProfilePicture,
		isValidLinksCreatorTagline,



		linksCreatorLinkFieldStatus,



		LINKS_CREATOR_NAMES_MAX_COUNT,



		linksCreatorNameFieldStatus,



		persistCreatorLinkFields,



		persistCreatorNameFields,



		setLinksCreateCreatorPageDescription,



		setLinksCreateCreatorProfilePicture,
		setLinksCreateCreatorTagline
	} from '$lib/client/links-create-state';
	import { setLinksCreateCreatorPageColors } from '$lib/client/links-create-page-colors';



	import LinksCreateDescriptionField from '$lib/components/LinksCreateDescriptionField.svelte';



	import LinksCreateLinksField from '$lib/components/LinksCreateLinksField.svelte';



	import LinksCreateNameField from '$lib/components/LinksCreateNameField.svelte';
	import LinksCreateAlmostDoneActions from '$lib/components/LinksCreateAlmostDoneActions.svelte';
	import LinksCreateProfilePictureField from '$lib/components/LinksCreateProfilePictureField.svelte';



	import LinksCreateTaglineField from '$lib/components/LinksCreateTaglineField.svelte';



	import LinksCreateThemeCards from '$lib/components/LinksCreateThemeCards.svelte';



	import { linksFade } from '$lib/links-page-transition';



	import { LINKS_CREATE_CONTEXT_KEY, type LinksCreateContextState } from '$lib/links-create-context';



	import {



		LINKS_CREATE_HEADLINES,



		nextLinksCreateStep,



		type LinksCreateStep



	} from '$lib/links-create-steps';



	import type { PageData } from './$types';







	let { data }: { data: PageData } = $props();







	const linksCreateState = getContext<LinksCreateContextState>(LINKS_CREATE_CONTEXT_KEY);







	const step = $derived(data.step as LinksCreateStep);



	const headline = $derived(LINKS_CREATE_HEADLINES[step]);



	const nextStep = $derived(nextLinksCreateStep(step));



	const nextLabel = $derived(
		step === 'hello'
			? 'Hi?'
			: step === 'gloops'
				? 'Okay!'
				: step === 'photo'
					? 'Done'
					: 'Next'
	);



	const isThemeStep = $derived(step === 'theme');



	const isNameStep = $derived(step === 'name');



	const isTaglineStep = $derived(step === 'tagline');



	const isDescriptionStep = $derived(step === 'description');



	const isLinksStep = $derived(step === 'links');
	const isPhotoStep = $derived(step === 'photo');
	const isAlmostDoneStep = $derived(step === 'almost-done');
	const isCustomizeStep = $derived(step === 'customize');



	const nameFieldStatus = $derived(



		linksCreatorNameFieldStatus(linksCreateState.creatorNameFields)



	);



	const linkFieldStatus = $derived(



		linksCreatorLinkFieldStatus(linksCreateState.creatorLinkFields)



	);



	const hasValidTagline = $derived(isValidLinksCreatorTagline(linksCreateState.creatorTagline));



	const hasValidDescription = $derived(
		isValidLinksCreatorPageDescription(linksCreateState.creatorPageDescription)
	);
	const hasValidProfilePicture = $derived(
		isValidLinksCreatorProfilePicture(linksCreateState.creatorProfilePicture)
	);



	const isRevealStep = $derived(



		isThemeStep ||



			isNameStep ||



			isTaglineStep ||



			isDescriptionStep ||



			isLinksStep ||
			isPhotoStep ||
			isAlmostDoneStep ||
			isCustomizeStep
	);



	const canContinue = $derived(



		(isThemeStep && linksCreateState.selectedTheme != null) ||



			(isNameStep && nameFieldStatus.canContinue) ||



			(isTaglineStep && hasValidTagline) ||



			(isDescriptionStep && hasValidDescription) ||



			(isLinksStep && linkFieldStatus.canContinue) ||
			(isPhotoStep && hasValidProfilePicture) ||
			!isRevealStep
	);

	const showNextButton = $derived(



		(isThemeStep && linksCreateState.selectedTheme != null) ||



			(isNameStep && nameFieldStatus.hasValid) ||



			(isTaglineStep && hasValidTagline) ||



			(isDescriptionStep && hasValidDescription) ||



			(isLinksStep && linkFieldStatus.hasValid) ||
			(isPhotoStep && hasValidProfilePicture) ||
			!isRevealStep
	);







	function addAnotherName() {



		if (!nameFieldStatus.hasValid) return;



		if (linksCreateState.creatorNameFields.length >= LINKS_CREATOR_NAMES_MAX_COUNT) return;



		const id = linksCreateState.nextCreatorNameFieldId;



		linksCreateState.nextCreatorNameFieldId += 1;



		linksCreateState.creatorNameFields = [



			...linksCreateState.creatorNameFields,



			{ id, value: '' }



		];



		linksCreateState.focusCreatorNameFieldId = id;



	}







	function addAnotherLink() {



		if (!linkFieldStatus.hasValid) return;



		const id = linksCreateState.nextCreatorLinkFieldId;



		linksCreateState.nextCreatorLinkFieldId += 1;



		linksCreateState.creatorLinkFields = [



			...linksCreateState.creatorLinkFields,



			{ id, label: '', url: '', iconMode: 'basic' }



		];



		linksCreateState.focusCreatorLinkFieldId = id;



	}







	function goNext() {



		if (!nextStep || !canContinue) return;



		if (isNameStep) persistCreatorNameFields(linksCreateState.creatorNameFields);



		if (isTaglineStep) setLinksCreateCreatorTagline(linksCreateState.creatorTagline);



		if (isDescriptionStep) {



			setLinksCreateCreatorPageDescription(linksCreateState.creatorPageDescription);



		}



		if (isLinksStep) persistCreatorLinkFields(linksCreateState.creatorLinkFields);
		if (isPhotoStep) {
			setLinksCreateCreatorProfilePicture(linksCreateState.creatorProfilePicture);
		}
		if (isCustomizeStep) {
			setLinksCreateCreatorPageColors(linksCreateState.creatorPageColors);
		}

		goto(`/links/create/${nextStep}`);



	}



</script>







<svelte:head>



	<title>



		{isThemeStep



			? 'Select your theme'



			: isNameStep



				? 'What is your name?'



				: isTaglineStep



					? "What's your tagline?"



					: isDescriptionStep



						? 'Your page description'



						: isLinksStep
							? 'Your Links'
							: isPhotoStep
								? 'Profile picture'
								: isAlmostDoneStep
									? 'Almost done'
									: isCustomizeStep
										? 'Customize your page'
										: headline} · Links · GloopGlop



	</title>



</svelte:head>







{#if isThemeStep}



	<LinksCreateThemeCards />



{:else if isNameStep}



	<LinksCreateNameField />



{:else if isTaglineStep}



	<LinksCreateTaglineField />



{:else if isDescriptionStep}



	<LinksCreateDescriptionField />



{:else if isLinksStep}
	<LinksCreateLinksField />
{:else if isPhotoStep}
	<LinksCreateProfilePictureField />
{:else if isAlmostDoneStep}
	<LinksCreateAlmostDoneActions />
{/if}







<div class="relative mx-auto mt-8 flex min-h-12 flex-col items-center gap-3">



	{#if showNextButton && !isCustomizeStep && !isAlmostDoneStep}



		<div class="flex flex-col items-center gap-3" in:fade={linksFade}>



			{#if isNameStep && linksCreateState.creatorNameFields.length < LINKS_CREATOR_NAMES_MAX_COUNT}



				<button type="button" class="btn btn-ghost btn-sm" onclick={addAnotherName}>



					Add another name



				</button>



			{/if}



			{#if isLinksStep}



				<button type="button" class="btn btn-ghost btn-sm" onclick={addAnotherLink}>



					Add another link



				</button>



			{/if}



			<button



				type="button"



				class="btn min-w-[6.375rem] border-[#5f9626] bg-[#7ac943] text-[#10210a] hover:border-[#4c7a1f] hover:bg-[#6fb93b] disabled:cursor-not-allowed disabled:opacity-50"



				onclick={goNext}



				disabled={!nextStep || !canContinue}



			>



				{nextLabel}



			</button>



		</div>



	{/if}



</div>


