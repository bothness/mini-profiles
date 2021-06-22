<script>
	import { getData, suffixer } from "./utils";
	import { urls, types, codes, mapSources, mapLayers, mapPaint } from "./config";
	import ColChart from "./chart/ColChart.svelte";
	import SpineChart from "./chart/SpineChart.svelte";
	import GridChart from "./chart/GridChart.svelte";
	import GridLegend from "./chart/GridLegend.svelte";
	import Select from "./ui/Select.svelte";
	import Warning from "./ui/Warning.svelte";
	import Map from "./map/Map.svelte";
	import MapSource from "./map/MapSource.svelte";
	import MapLayer from "./map/MapLayer.svelte";
	
	let options, selected, place, quartiles;
	let map = null;
	let active = {
		selected: null,
		type: null,
		childType: null,
		highlighted: [],
		hovered:  null
	};
	
	getData(urls.options)
	.then(res => {
		res.forEach(d => {
			d.typepl = types[d.type].pl;
			d.typenm = types[d.type].name;
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
					updateActive(place);
					fitMap(place.bounds);
				});
			} else {
				quartiles = null;
				place = json;
				updateActive(place);
				fitMap(place.bounds);
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

	function updateActive(place)  {
		let prev = JSON.parse(JSON.stringify(active));
		let code = place.code;
		let type = place.type;
		let siblings = options.filter(d => d.type == type && d.code != code).map(d => d.code);
		let children = place.children[0] ? place.children.map(d => d.code) : [];
		let childType = children[0] ? place.children[0].type : null;

		active.selected = code;
		console.log(code);
		active.type = type;
		active.childType = childType;
		active.highlighted = [...siblings, ...children];

		let keys = Object.keys(mapLayers);
		let fillProps = ['fill-color', 'fill-opacity'];
		let lineProps = ['line-color', 'line-width', 'line-opacity'];

		// NOTE!!! SHOULD USE LAYOUT.VISIBILITY = 0 FOR INACTIVE LAYERS!!!

		// Change layer paint properties if geography level changes
		if (map && active.type != prev.type) {
			// Reset map layer paint properties
			keys.forEach(key => {
				fillProps.forEach(prop => map.setPaintProperty(key + '-fill', prop, mapPaint.fill[prop]));
				lineProps.forEach(prop => {
					map.setPaintProperty(key + '-bounds', prop, mapPaint.line[prop]);
					map.setPaintProperty(key + '-self', prop, mapPaint.line[prop]);
				});
			});

			// Set new paint properties
			lineProps.forEach(prop => map.setPaintProperty(type + '-self', prop, mapPaint['line-self'][prop]));
			if (place.parents[0]) {
				fillProps.forEach(prop => map.setPaintProperty(type + '-fill', prop, mapPaint[children[0] ? 'fill-active' : 'fill-self'][prop]));
				lineProps.forEach(prop => map.setPaintProperty(type + '-bounds', prop, mapPaint['line-active'][prop]));
			}
			if (childType) {
				fillProps.forEach(prop => map.setPaintProperty(childType + '-fill', prop, mapPaint['fill-child'][prop]));
				lineProps.forEach(prop => map.setPaintProperty(childType + '-bounds', prop, mapPaint['line-child'][prop]));
			}
		}
	}

	function fitMap(bounds) {
		if (map) {
			map.fitBounds(bounds, {padding: 20});
		}
	}

	function mapSelect(ev) {
		selected = options.find(d => d.code == ev.detail.code);
		loadArea(selected.code);
	}
</script>

<Warning/>

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
		<Select {options} bind:selected group="typenm" search={true} on:select="{() => { if (selected) { loadArea(selected.code) }}}"/>
		</div>
	</div>
</div>

<div class="grid mt">
	<div>
		<span class="text-label">Population</span>
		<br/>
		<span class="text-big">{place.data.population.value['2011'].all.toLocaleString()}</span>
		<span class="text-change" class:increase="{place.data.population.value.change.all > 0}">{place.data.population.value.change.all}%</span>
		{#if quartiles}
		<div class="chart" style="height: 40px;">
			<SpineChart data="{[{x: place.data.population.value['2011'].all}]}" ticks="{quartiles.population.value['2011'].all}" formatTick="{d => (d / 1000).toFixed(0)}" suffix="k" scale="sqrt"/>
		</div>
		{/if}
		{#if place.data.population.value_rank}
		<div class="text-small muted">{place.data.population.value_rank['2011'].all.toLocaleString()}{suffixer(place.data.population.value_rank['2011'].all)} most populous of {place.count.toLocaleString()} {types[place.type].pl.toLowerCase()}</div>
		{/if}
	</div>
	<div>
		<span class="text-label">Density</span>
		<br/>
		<span class="text-big">{place.data.density.value['2011'].all.toFixed(1)}</span>
		<span>people per hectare</span>
		{#if quartiles}
		<div class="chart" style="height: 40px;">
			<SpineChart data="{[{x: place.data.density.value['2011'].all}]}" ticks="{quartiles.density.value['2011'].all}" formatTick="{d => d.toFixed(0)}" scale="sqrt"/>
		</div>
		{/if}
		{#if place.data.density.value_rank}
		<div class="text-small muted">{place.data.density.value_rank['2011'].all.toLocaleString()}{suffixer(place.data.density.value_rank['2011'].all)} densest of {place.count.toLocaleString()} {types[place.type].pl.toLowerCase()}</div>
		{/if}
	</div>
	<div>
		<span class="text-label">Median Age</span>
		<br/>
		<span class="text-big">{place.data.agemed.value['2011'].all}</span>
		<span class="text-change" class:increase="{place.data.agemed.value['2011'].all - place.data.agemed.value['2001'].all > 0}">{place.data.agemed.value['2011'].all - place.data.agemed.value['2001'].all} yrs</span>
		{#if quartiles}
		<div class="chart" style="height: 40px;">
			<SpineChart data="{[{x: place.data.agemed.value['2011'].all}]}" ticks="{quartiles.agemed.value['2011'].all}" formatTick="{d => d.toFixed(0)}" scale="log"/>
		</div>
		{/if}
		{#if place.data.agemed.value_rank}
		<div class="text-small muted">{place.data.agemed.value_rank['2011'].all.toLocaleString()}{suffixer(place.data.agemed.value_rank['2011'].all)} oldest of {place.count.toLocaleString()} {types[place.type].pl.toLowerCase()}</div>
		{/if}
	</div>
	<div>
		<span class="text-label">Age profile</span><br/>
		<div class="chart" style="height: 85px;">
			<ColChart data="{makeData(place.data.age10yr.perc['2011'], 'age10yr')}"/>
		</div>
	</div>
	<div>
		<span class="text-label">Sex</span><br/>
		<div class="chart" style="height: 80px;">
			<GridChart data="{makeData(place.data.population.perc['2011'], 'population')}"/>
		</div>
		<div class="legend">
			<GridLegend data="{makeData(place.data.population.perc['2011'], 'population')}"/>
		</div>
	</div>
	<div>
		<span class="text-label">General health</span><br/>
		<div class="chart" style="height: 80px;">
			<GridChart data="{makeData(place.data.health.perc['2011'], 'health')}"/>
		</div>
		<div class="legend">
			<GridLegend data="{makeData(place.data.health.perc['2011'], 'health')}"/>
		</div>
	</div>
	<div class="map">
		<Map bind:map location={{bounds: place.bounds}}>
			<MapSource {...mapSources.wd}>
				<MapLayer
					{...mapLayers.wd}
					id="wd-fill"
					type="fill"
					click={true}
					selected={active.selected}
					on:select={mapSelect}
					highlight={true}
					highlighted={active.highlighted}
					hover={true}
					hovered={active.hovered}
					paint={active.type == 'wd' ? mapPaint['fill-self'] : active.childType == 'wd' ? mapPaint['fill-child'] : mapPaint.fill}/>
				<MapLayer
					{...mapLayers.wd}
					id="wd-bounds"
					type="line"
					selected={active.selected}
					highlight={true}
					highlighted={active.highlighted}
					paint={active.type == 'wd' ? mapPaint['line-active'] : active.childType == 'wd' ? mapPaint['line-child'] : mapPaint.line}/>
				<MapLayer
					{...mapLayers.wd}
					id="wd-self"
					type="line"
					selected={active.selected}
					paint={active.type == 'wd' ? mapPaint['line-self'] : mapPaint.line}/>
			</MapSource>
			<MapSource {...mapSources.crd}>
				{#each Object.keys(mapLayers).filter(d => d != 'wd') as key}
				<MapLayer
					{...mapLayers[key]}
					id={key + "-fill"}
					type="fill"
					click={true}
					selected={active.selected}
					on:select={mapSelect}
					highlight={true}
					highlighted={active.highlighted}
					hover={true}
					hovered={active.hovered}
					paint={active.type == key ? mapPaint['fill-active'] : active.childType == key ? mapPaint['fill-child'] : mapPaint.fill}/>
				<MapLayer
					{...mapLayers[key]}
					id={key + "-bounds"}
					type="line"
					selected={active.selected}
					highlight={true}
					highlighted={active.highlighted}
					paint={active.type == key ? mapPaint['line-active'] : active.childType == key ? mapPaint['line-child'] : mapPaint.line}/>
				<MapLayer
					{...mapLayers[key]}
					id={key + "-self"}
					type="line"
					selected={active.selected}
					paint={active.type == key ? mapPaint['line-self'] : mapPaint.line}/>
				{/each}
			</MapSource>
		</Map>
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
		grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
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
		min-height: 350px;
	}
	@media screen and (max-width:575px){
		.map {
			grid-column: span 1;
		}
	}
	</style>