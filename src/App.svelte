<script>
	import { getData } from "./utils";
	import { urls, types, codes } from "./config";
	import RankChart from "./RankChart.svelte";
	import ColChart from "./ColChart.svelte";
	import SpineChart from "./SpineChart.svelte";
	import GridChart from "./GridChart.svelte";
	import GridLegend from "./GridLegend.svelte";
	import Select from "./Select.svelte";
	
	let options, selected, place, quartiles;
	
	getData(urls.options)
	.then(res => {
		res.forEach(d => {
			d.typepl = types[d.type].pl;
			d.type = types[d.type].name;
		});
		options = res.sort((a, b) => a.name.localeCompare(b.name));
		selected = options.find(d => d.name == 'Fareham');
		loadArea(selected.code);
	});
	
	function loadArea(code) {
		fetch(urls.places + code + '.json')
		.then(res => res.json())
		.then(json => {
			json.children = options.filter(d => d.parent == code);
			
			if (json.count > 20) {
				fetch(urls.quantiles + json.type + '.json')
				.then(res => res.json())
				.then(quart => {
					quartiles = quart;
					place = json;
				});
			} else {
				quartiles = null;
				place = json;
			}
		})
	}
	
	function makeData(source, code) {
		const keys = codes[code].map(d => d.code);
		const labels = codes[code].map(d => d.label ? d.label : d.code);
		const data = keys.map((key, i) => {
			return {x: labels[i], y: source[key]}
		});
		return data;
	}
</script>

{#if place}
<div class="grid">
	<div class="text-small">
		{#if place.parents[0]}
		{#each place.parents.reverse() as parent, i}
		<a href="#{parent.code}" on:click="{() => loadArea(parent.code)}">{parent.name}</a>{@html ' &gt; '}
		{/each}
		{/if}
		{place.name}
	</div>
</div>
	
<div class="grid-2">
	<div>
		<span class="text-big">{place.name}</span><br/>
		{#if place.parents[0]}
		{types[place.type].name} in {place.parents[place.parents.length - 1].name}
		{/if}
	</div>
	<div>
		<div style="width: 240px; float: right;">
		<Select {options} bind:selected group="type" search={true} on:select="{() => { if (selected) { loadArea(selected.code) }}}"/>
		</div>
	</div>
</div>

<div class="grid mt">
	<div>
		<span class="text-label">Population</span>
		{#if place.data.population.value_rank}
		<span class="text-small muted">({place.data.population.value_rank['2011'].all.toLocaleString()} of {place.count.toLocaleString()} {types[place.type].pl.toLowerCase()})</span>
		{/if}
		<br/>
		<span class="text-big">{place.data.population.value['2011'].all.toLocaleString()}</span>
		<span class="text-change" class:increase="{place.data.population.value.change.all > 0}">{place.data.population.value.change.all}%</span>
		{#if quartiles}
		<div class="chart" style="height: 40px;">
			<SpineChart data="{[{x: place.data.population.value['2011'].all}]}" ticks="{quartiles.population.value['2011'].all}" formatTick="{d => (d / 1000).toFixed(0)}" suffix="k" scale="sqrt"/>
		</div>
		{/if}
	</div>
	<div>
		<span class="text-label">Density</span>
		{#if place.data.density.value_rank}
		<span class="text-small muted">({place.data.density.value_rank['2011'].all.toLocaleString()} of {place.count.toLocaleString()} {types[place.type].pl.toLowerCase()})</span>
		{/if}
		<br/>
		<span class="text-big">{place.data.density.value['2011'].all.toFixed(1)}</span>
		<span>people per hectare</span>
		{#if quartiles}
		<div class="chart" style="height: 40px;">
			<SpineChart data="{[{x: place.data.density.value['2011'].all}]}" ticks="{quartiles.density.value['2011'].all}" formatTick="{d => d.toFixed(0)}" scale="sqrt"/>
		</div>
		{/if}
	</div>
	<div>
		<span class="text-label">Median Age</span>
		{#if place.data.agemed.value_rank}
		<span class="text-small muted">({place.data.agemed.value_rank['2011'].all.toLocaleString()} of {place.count.toLocaleString()} {types[place.type].pl.toLowerCase()})</span>
		{/if}
		<br/>
		<span class="text-big">{place.data.agemed.value['2011'].all}</span>
		<span class="text-change" class:increase="{place.data.agemed.value['2011'].all - place.data.agemed.value['2001'].all > 0}">{place.data.agemed.value['2011'].all - place.data.agemed.value['2001'].all} yrs</span>
		{#if quartiles}
		<div class="chart" style="height: 40px;">
			<SpineChart data="{[{x: place.data.agemed.value['2011'].all}]}" ticks="{quartiles.agemed.value['2011'].all}" formatTick="{d => d.toFixed(0)}" scale="log"/>
		</div>
		{/if}
	</div>
	<div>
		<span class="text-label">Age profile</span><br/>
		<div class="chart" style="height: 85px;">
			<ColChart data="{makeData(place.data.age10yr.perc['2011'], 'age10yr')}"/>
		</div>
	</div>
	<div>
		<span class="text-label">Economic activity</span><br/>
		<div class="chart" style="height: 80px;">
			<GridChart data="{makeData(place.data.economic.perc['2011'], 'economic')}"/>
		</div>
		<div class="legend">
			<GridLegend data="{makeData(place.data.economic.perc['2011'], 'economic')}"/>
		</div>
	</div>
	<div>
		<span class="text-label">Ethnicity</span><br/>
		<div class="chart" style="height: 80px;">
			<GridChart data="{makeData(place.data.ethnicity.perc['2011'], 'ethnicity')}"/>
		</div>
		<div class="legend">
			<GridLegend data="{makeData(place.data.ethnicity.perc['2011'], 'ethnicity')}"/>
		</div>
	</div>
	{#if false}
	<div class="map">Map goes here</div>
	{/if}
</div>

{#if place.children[0]}
<div class="grid mt">
	<div>
		<span class="text-label">{place.children[0].typepl} within {place.name}</span><br/>
		<span class="text-small">
		{#each place.children as child, i}
		<a href="#{child.code}" on:click="{() => loadArea(child.code)}">{child.name}</a>{ i < place.children.length - 1 ? ', ' : ''}
		{/each}
		</span>
	</div>
</div>
{/if}

<div class="grid-2 mt">
	<div>
		<img src="https://onsvisual.github.io/svelte-scrolly/img/ons-logo-pos-en.svg" alt="Office for National Statistics"/>
	</div>
	<div class="right">
		<span class="text-small">Source: Census 2011, with change +/- from Census 2001.</span>
	</div>
</div>
{/if}

<style>
	@import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;700&display=swap');
	:global(body) {
		font-family: 'Open Sans', sans-serif;
		padding: 20px;
	}
	a {
		color: rgb(0, 60, 87);
	}
	img {
		width: 200px;
	}
	.text-big {
		font-size: 2em;
		font-weight: bold;
	}
	.text-small {
		font-size: 0.85em;
	}
	.text-label {
		font-weight: bold;
	}
	.text-change {
		color: red;
	}
	.muted {
		color: grey;
	}
	.increase {
		color: green;
	}
	.increase::before {
		content: "+";
	}
	.right {
		text-align: right;
	}
	.mt {
		margin-top: 20px;
	}
	.grid {
		display: grid;
		width: 100%;
		grid-gap: 20px;
		grid-template-columns: repeat(auto-fit, minmax(min(250px, 100%), 1fr));
		justify-content: stretch;
		grid-auto-flow: row dense;
	}
	.grid-2 {
		display: grid;
		width: 100%;
		grid-gap: 10px;
		grid-template-columns: auto auto;
	}
	.chart {
		width: 100%;
	}
	.legend {
		width: 100%;
		margin-top: 3px;
	}
	.map {
		grid-column: span 2;
		grid-row: span 2;
		background-color: #eee;
		min-height: 300px;
		display: flex;
		flex-flow: column;
		justify-content: center;
		text-align: center;
		color: #999;
	}
	@media screen and (max-width:575px){
		.map {
			grid-column: span 1;
		}
	}
	</style>