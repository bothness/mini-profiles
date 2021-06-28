<script>
	import { getData, suffixer, changeClass, changeStr } from "./utils";
	import { urls, types, codes, mapStyle, mapSources, mapLayers, mapPaint } from "./config";
	import ColChart from "./chart/ColChart.svelte";
	import SpineChart from "./chart/SpineChart.svelte";
	import StackedBarChart from "./chart/StackedBarChart.svelte";
	import Select from "./ui/Select.svelte";
	import Warning from "./ui/Warning.svelte";
	import Map from "./map/Map.svelte";
	import MapSource from "./map/MapSource.svelte";
	import MapLayer from "./map/MapLayer.svelte";
	
	let options, selected, place, ew, quartiles, w, cols;
	let map = null;
	let active = {
		selected: null,
		type: null,
		childType: null,
		highlighted: [],
		hovered:  null
	};
	let overtime = false;
	
	getData(urls.options)
	.then(res => {
		res.forEach(d => {
			d.typepl = types[d.type].pl;
			d.typenm = types[d.type].name;
		});
		options = res.sort((a, b) => a.name.localeCompare(b.name));
		selected = options.find(d => d.name == 'Fareham');
		loadEW();
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
		});
	}

	function loadEW() {
		const code = 'K04000001';
		fetch(urls.places + code + '.json')
		.then(res => res.json())
		.then(json => {
			json.children = options.filter(d => d.parent == code);
			ew = json;
		});
	}
	
	function makeData(props) {
		let code = props[0];
		let val = props[1];
		
		let source = place.data[code][val]['2011'];
		let sourcePrev = place.data[code][val]['2001'];
		let sourceEW = ew.data[code][val]['2011'];

		let keys = codes[code].map(d => d.code);
		let labels = codes[code].map(d => d.label ? d.label : d.code);
		let data = keys.map((key, i) => {
			return {x: labels[i], y: source[key], ew: sourceEW[key], prev: sourcePrev[key]};
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
		active.type = type;
		active.childType = childType;
		active.highlighted = [...siblings, ...children];

		let keys = Object.keys(mapLayers);
		let fillProps = ['fill-color', 'fill-opacity'];
		let lineProps = ['line-color', 'line-width', 'line-opacity'];

		// Change layer visibility and paint properties if geography level changes
		if (map && (active.type != prev.type || active.childType != prev.childType)) {
			// Set map layer visibility properties
			keys.forEach(key => {
				let visibility = key == type || (childType && key == childType) ? 'visible' : 'none';
				map.setLayoutProperty(key + '-fill', 'visibility', visibility);
				map.setLayoutProperty(key + '-bounds', 'visibility', visibility);
				if (place.parents[0]) {
					map.setLayoutProperty(key + '-self', 'visibility', visibility);
				}
			});

			// Set new paint properties
			if (place.parents[0]) {
				fillProps.forEach(prop => map.setPaintProperty(type + '-fill', prop, mapPaint[children[0] ? 'fill-active' : 'fill-self'][prop]));
				lineProps.forEach(prop => {
					map.setPaintProperty(type + '-bounds', prop, mapPaint['line-active'][prop]);
					map.setPaintProperty(type + '-self', prop, mapPaint['line-self'][prop]);
				});
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

	function onResize() {
		cols = window.getComputedStyle(grid).getPropertyValue("grid-template-columns").split(" ").length;
	}

	$: w && onResize();
</script>

<Warning/>

{#if place && ew}
<div class="grid-2">
	<div>
		<span class="text-big">{place.name}</span><br/>
		{#if place.parents[0]}
		{types[place.type].name} in {place.parents[0].name}<br/>
		{/if}
	</div>
	<div>
		<div style="width: 240px; float: right;">
		<Select {options} bind:selected group="typenm" search={true} on:select="{() => { if (selected) { loadArea(selected.code) }}}"/>
		</div>
	</div>
</div>


<div class="grid-2 mts">
	<div class="text-small">
		Comparison:
		<button class="btn" class:btn-active={!overtime} on:click={() => overtime = false}>National figures</button>
		<button class="btn" class:btn-active={overtime} on:click={() => overtime = true}>Change from 2001</button>
	</div>
</div>

<div id="grid" class="mt" bind:clientWidth={w}>
	<div>
		<span class="text-label">Population</span>
		<br/>
		<span class="text-big">{place.data.population.value['2011'].all.toLocaleString()}</span>
		<span class="{changeClass(place.data.population.value.change.all)}">{changeStr(place.data.population.value.change.all, '%', 1)}</span>
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
		<span class="text-big inline">{place.data.density.value['2011'].all.toFixed(1)}</span>
		<span class="inline condensed text-small">people<br/>per hectare</span>
		<span class="inline {changeClass(place.data.population.value.change.all)}">{changeStr(place.data.population.value.change.all, '%', 1)}</span>
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
		<span class="{changeClass(place.data.agemed.value['2011'].all - place.data.agemed.value['2001'].all)}">{changeStr(place.data.agemed.value['2011'].all - place.data.agemed.value['2001'].all, 'yrs')}</span>
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
			<ColChart data="{place && makeData(['age10yr', 'perc', '2011'])}" zKey="{overtime ? 'prev' : place.type != 'ew' ? 'ew' : null}"/>
		</div>
		{#if !overtime && place.type != 'ew'}
		<div class="text-small muted"><li class="line"></li> shows England & Wales profile</div>
		{:else if overtime}
		<div class="text-small muted"><li class="line"></li> shows 2001 profile</div>
		{/if}
	</div>
	<div>
		<span class="text-label">Economic activity</span><br/>
		<StackedBarChart data="{place && makeData(['economic', 'perc', '2011'])}" zKey="{overtime ? 'prev' : place.type != 'ew' ? 'ew' : null}"/>
	</div>
	<div>
		<span class="text-label">Travel to work</span><br/>
		<StackedBarChart data="{place && makeData(['travel', 'perc', '2011'])}" zKey="{overtime ? 'prev' : place.type != 'ew' ? 'ew' : null}"/>
	</div>
	<div>
		<span class="text-label">Ethnicity</span><br/>
		<StackedBarChart data="{place && makeData(['ethnicity', 'perc', '2011'])}" zKey="{overtime ? 'prev' : place.type != 'ew' ? 'ew' : null}"/>
	</div>
	<div>
		<span class="text-label">Housing tenure</span><br/>
		<StackedBarChart data="{place && makeData(['tenure', 'perc', '2011'])}" zKey="{overtime ? 'prev' : place.type != 'ew' ? 'ew' : null}"/>
	</div>
	<div id="map" style="grid-column: span {w && w < 575 ? 1 : cols && cols > 2 ? cols - 1 : 2};">
		<Map bind:map location={{bounds: place.bounds}} style={mapStyle}>
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
					layout={{visibility: active.type == 'wd' || active.childType == 'wd' ? 'visible' : 'none'}}
					paint={active.type == 'wd' ? mapPaint['fill-self'] : active.childType == 'wd' ? mapPaint['fill-child'] : mapPaint.fill}/>
				<MapLayer
					{...mapLayers.wd}
					id="wd-bounds"
					type="line"
					selected={active.selected}
					highlight={true}
					highlighted={active.highlighted}
					layout={{visibility: active.type == 'wd' || active.childType == 'wd' ? 'visible' : 'none'}}
					paint={active.type == 'wd' ? mapPaint['line-active'] : active.childType == 'wd' ? mapPaint['line-child'] : mapPaint.line}/>
				<MapLayer
					{...mapLayers.wd}
					id="wd-self"
					type="line"
					selected={active.selected}
					layout={{visibility: active.type == 'wd' ? 'visible' : 'none'}}
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
					layout={{visibility: active.type == key || active.childType == key ? 'visible' : 'none'}}
					paint={active.type == key ? mapPaint['fill-active'] : active.childType == key ? mapPaint['fill-child'] : mapPaint.fill}/>
				<MapLayer
					{...mapLayers[key]}
					id={key + "-bounds"}
					type="line"
					selected={active.selected}
					highlight={true}
					highlighted={active.highlighted}
					layout={{visibility: active.type == key || active.childType == key ? 'visible' : 'none'}}
					paint={active.type == key ? mapPaint['line-active'] : active.childType == key ? mapPaint['line-child'] : mapPaint.line}/>
				<MapLayer
					{...mapLayers[key]}
					id={key + "-self"}
					type="line"
					selected={active.selected}
					layout={{visibility: active.type == key ? 'visible' : 'none'}}
					paint={active.type == key ? mapPaint['line-self'] : mapPaint.line}/>
				{/each}
			</MapSource>
		</Map>
	</div>
	<div>
		<span class="text-label">Parents of {place.name}</span><br/>
		<span class="text-small">
		{#if place.parents[0]}
		{#each [...place.parents].reverse() as parent, i}
		<span style="display: block; margin-left: {i > 0 ? (i - 1) * 15 : 0}px">{@html i > 0 ? '↳ ' : ''}<a href="#{parent.code}" on:click="{() => loadArea(parent.code)}">{parent.name}</a></span>
		{/each}
		{:else}
		<span class="muted">No parents for {place.name}</span>
		{/if}
		</span>
	</div>
	<div>
		<span class="text-label">{place.children[0] ? place.children[0].typepl : 'Areas'} within {place.name}</span><br/>
		<span class="text-small">
		{#if place.children[0]}
		{#each place.children as child, i}
		<a href="#{child.code}" on:click="{() => loadArea(child.code)}">{child.name}</a>{ i < place.children.length - 1 ? ', ' : ''}
		{/each}
		{:else}
		<span class="muted">No areas within {place.name}</span>
		{/if}
		</span>
	</div>
</div>

<div class="grid-2 mt mbs">
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
	.btn {
		padding: 2px 4px;
		margin: 0;
		border: 2px solid #206095;
		cursor: pointer;
		color: #206095;
		background-color: lightgrey;
	}
	.btn-active {
		color: white;
		background-color: #206095;
	}
	.text-big {
		font-size: 2.2em;
		font-weight: bold;
	}
	.text-small {
		font-size: 0.85em;
	}
	.text-label {
		font-weight: bold;
	}
	.muted {
		color: grey;
	}
	.increase {
		color: green;
	}
	.increase::before {
		content: '▲';
		color: green;
	}
	.decrease {
		color: red;
	}
	.decrease::before {
		content: '▼';
		color: red;
	}
	.nochange {
		font-size: 0.85em;
		color: grey;
	}
	.line {
		background-color: #27A0CC;
		width: 25px;
  	height: 2px;
  	display: inline-block;
		margin-bottom: 3px;
	}
	.right {
		text-align: right;
	}
	.inline {
		display: inline-block;
	}
	.condensed {
		line-height: 1.1em;
	}
	.mt {
		margin-top: 20px;
	}
	.mts {
		margin-top: 10px;
	}
	.mbs {
		margin-bottom: 10px;
	}
	#grid {
		display: grid;
		width: 100%;
		grid-gap: 20px;
		grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
		justify-content: stretch;
	}
	.grid-2 {
		display: grid;
		width: 100%;
		grid-gap: 10px;
		grid-template-columns: auto auto;
	}
	.chart {
		position: relative;
		width: 100%;
	}
	#map {
		grid-row: span 2;
		min-height: 450px;
	}
	</style>