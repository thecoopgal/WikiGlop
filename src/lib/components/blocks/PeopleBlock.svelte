<script lang="ts">
	type Props = {
		items?: Array<{ name: string; role?: string; bio?: string; image?: string }>;
	};

	let { items } = $props() as Props;
</script>

{#if items && items.length}
	<section class="my-10">
		<div class="grid gap-4 md:grid-cols-2">
			{#each items as person (person.name)}
				<div class="card bg-base-100 shadow-sm">
					<div class="card-body">
						<div class="flex gap-4">
							{#if person.image}
								<img
									src={person.image}
									alt={person.name}
									class="h-16 w-16 rounded-full object-cover"
								/>
							{/if}
							<div>
								<h3 class="card-title">
									{person.name}
									{#if person.role}
										<span class="text-sm font-normal opacity-70">— {person.role}</span>
									{/if}
								</h3>
								{#if person.bio}
									<p class="mt-2 opacity-90">{person.bio}</p>
								{/if}
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</section>
{:else}
	<section class="my-10">
		<p class="text-sm text-warning">No people defined.</p>
	</section>
{/if}

