<script>
	import { setContext } from "svelte";
	import { getData, suffixer, changeClass, changeStr, adjectify } from "./utils";
	import { themes, urls, types, codes, mapStyle, mapSources, mapLayers, mapPaint } from "./config";
	import Warning from "./ui/Warning.svelte";
	import ONSHeader from "./layout/ONSHeader.svelte";
	import ONSFooter from "./layout/ONSFooter.svelte";
	import Section from "./layout/Section.svelte";
	import ColChart from "./chart/ColChart.svelte";
	import StackedBarChart from "./chart/StackedBarChart.svelte";
	import Em from "./ui/Em.svelte";
	import Select from "./ui/Select.svelte";
	import Map from "./map/Map.svelte";
	import MapSource from "./map/MapSource.svelte";
	import MapLayer from "./map/MapLayer.svelte";

	// STYLE CONFIG
	// Set theme globally (options are 'light' or 'dark')
	let theme = "light";
	setContext("theme", themes[theme]);
	
	let options, selected, place, ew, deciles, w, cols;
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
		let lookup = {};
		res.forEach(d => lookup[d.code] = d.name);
		res.forEach(d => {
			d.typepl = types[d.type].pl;
			d.typenm = types[d.type].name;
			d.typestr = lookup[d.parent] ? `${types[d.type].name} in ${lookup[d.parent]}` : '';
		});
		options = res.sort((a, b) => a.name.localeCompare(b.name));
		loadEW();
		onHash();
	});
	
	function loadArea(code) {
		fetch(urls.places + code + '.json')
		.then(res => res.json())
		.then(json => {
			json.children = options.filter(d => d.parent == code);
			
			if (json.count > 20) {
				fetch(urls.quantiles + json.type + '.json')
				.then(res => res.json())
				.then(dec => {
					deciles = dec;
					place = json;
					updateActive(place);
					fitMap(place.bounds);
				});
			} else {
				deciles = null;
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

	function makeQuart(deciles) {
		return [deciles[0], deciles[2], deciles[5], deciles[8], deciles[10]];
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
		window.location.hash = `#/${ev.detail.code}`;
	}

	function menuSelect(ev) {
		window.location.hash = `#/${ev.detail.value}`;
	}

	function onResize() {
		cols = w < 575 ? 1 : window.getComputedStyle(grid).getPropertyValue("grid-template-columns").split(" ").length;
	}

	function onHash() {
		let hash = window.location.hash;
		let code = 'K04000001';
		if (hash) {
			let parts = hash.split('/');
			if (parts.length == 2) {
				let codes = options.map(d => d.code);
				code = codes.includes(parts[1]) ? parts[1] : code;
			}
		}
		selected = options.find(d => d.code == code);
		loadArea(selected.code);
	}
	
	window.onhashchange = onHash;

	$: w && onResize();

	$: chartLabel = overtime ? '2001 comparison' : place && place.parents[0] ? 'England and Wales comparison' : null;
</script>

<Warning/>

<ONSHeader/>

<Section column="wide">
{#if place && ew}
<div class="grid mtl">
	<div>
		{#if place.parents[0]}
		<span class="text-small">
			{#each [...place.parents].reverse() as parent, i}
			<a href="#/{parent.code}">{parent.name}</a>{@html ' &gt; '}
			{/each}
			{place.name}
		</span><br/>
		{/if}
		<span class="text-big title">{place.name}</span>
	</div>
	<div>
		<div style="width: 260px; padding-top: 5px;" class:float-right={cols > 1}>
		<Select {options} bind:selected group="typestr" search={true} on:select="{menuSelect}"/>
		</div>
	</div>
</div>


<div class="grid mts">
	<div class="text-small">
		Comparison:
		<button class="btn" class:btn-active={!overtime} on:click={() => overtime = false}>National-level figures</button>
		<button class="btn" class:btn-active={overtime} on:click={() => overtime = true}>Change from 2001</button>
	</div>
</div>

<div id="grid" class="grid mt" bind:clientWidth={w}>
	<div style="grid-column: span {cols};">
		<h3>Overview <span class="title-inset muted">Census 2011</span></h3>
	</div>
	<div>
			{#if place.type == 'ew' || place.type =='ctry'}
			The population of {place.name} was {place.data.population.value['2011'].all.toLocaleString()} at the time of the 2011 Census.
			{:else}
			{place.name} is a {types[place.type].name.toLowerCase()} in {place.parents[0].type == 'rgn' ? 'the ' + place.parents[0].name : place.parents[0].name}.
			The {types[place.type].name.toLowerCase()}'s population of {place.data.population.value['2011'].all.toLocaleString()} at the time of the 2011 Census made it the country's {place.data.population.value_rank['2011'].all.toLocaleString()}{suffixer(place.data.population.value_rank['2011'].all)} largest.
			{/if}
			{place.name} saw a population {place.data.population.value.change.all > 0 ? 'increase' : 'decrease'} of {changeStr(place.data.population.value.change.all, '%', 1)} from 2001.
	</div>
	<div>
		<span class="text-bold">Population</span>
		<br/>
		<span class="text-big">{place.data.population.value['2011'].all.toLocaleString()}</span><br/>
		{#if overtime}
		<span class="text-small"><Em><span class="{changeClass(place.data.population.value.change.all)}">{changeStr(place.data.population.value.change.all, '%', 1)}</span></Em> since 2001</span>
		{#if place.type != 'ew' && place.type != 'ctry'}
		<div class="text-small muted">{place.data.population.value_rank.change.all.toLocaleString()}{suffixer(place.data.population.value_rank.change.all)} largest increase of {place.count.toLocaleString()} {types[place.type].pl.toLowerCase()}</div>
		{/if}
		{:else}
		{#if place.type != 'ew'}
		<span class="text-small"><Em>{place.data.population.value['2011'].all / ew.data.population.value['2011'].all >= 0.001 ? ((place.data.population.value['2011'].all / ew.data.population.value['2011'].all) * 100).toFixed(1) : '<0.1'}%</Em> of England and Wales population</span>
		{#if place.type != 'ctry'}
		<div class="text-small muted">{place.data.population.value_rank['2011'].all.toLocaleString()}{suffixer(place.data.population.value_rank['2011'].all)} largest population of {place.count.toLocaleString()} {types[place.type].pl.toLowerCase()}</div>
		{/if}
		{/if}
		{/if}
	</div>
	<div>
		<span class="text-bold">Density</span>
		<br/>
		<span class="inline text-big">{place.data.density.value['2011'].all.toLocaleString()}</span>
		<span class="inline condensed text-small">people<br/>per hectare</span><br/>
		{#if overtime}
		<span class="text-small"><Em><span class="{changeClass(place.data.population.value.change.all)}">{changeStr(place.data.population.value.change.all, '%', 1)}</span></Em> since 2001</span>
		{#if place.type != 'ew' && place.type != 'ctry'}
		<div class="text-small muted">{place.data.population.value_rank.change.all.toLocaleString()}{suffixer(place.data.population.value_rank.change.all)} largest increase of {place.count.toLocaleString()} {types[place.type].pl.toLowerCase()}</div>
		{/if}
		{:else}
		{#if place.type != 'ew' && place.type != 'ctry'}
		<span class="text-small"><Em>{adjectify(place.count, place.data.density.value_rank['2011'].all)}</Em> average density</span>
		<div class="text-small muted">{place.data.density.value_rank['2011'].all.toLocaleString()}{suffixer(place.data.density.value_rank['2011'].all)} highest density of {place.count.toLocaleString()} {types[place.type].pl.toLowerCase()}</div>
		{/if}
		{/if}
	</div>
	<div style="grid-column: span {cols};">
		<h3>Explore related areas</h3>
	</div>
	<div id="map" style="grid-column: span {cols == 2 ? 2 : cols && cols > 2 ? cols - 1 : 1};">
		<Map bind:map location={{bounds: place.bounds}} options={{fitBoundsOptions: {padding: 20}}} style={mapStyle}>
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
		<span class="text-bold">Parents of {place.name}</span><br/>
		<span class="text-small">
		{#if place.parents[0]}
		{#each [...place.parents].reverse() as parent, i}
		<span style="display: block; margin-left: {i > 0 ? (i - 1) * 15 : 0}px">{@html i > 0 ? '↳ ' : ''}<a href="#/{parent.code}" on:click="{() => loadArea(parent.code)}">{parent.name}</a></span>
		{/each}
		{:else}
		<span class="muted">No parents for {place.name}</span>
		{/if}
		</span>
	</div>
	<div>
		<span class="text-bold">{place.children[0] ? place.children[0].typepl : 'Areas'} within {place.name}</span><br/>
		<span class="text-small">
		{#if place.children[0]}
		{#each place.children as child, i}
		<a href="#/{child.code}">{child.name}</a>{ i < place.children.length - 1 ? ', ' : ''}
		{/each}
		{:else}
		<span class="muted">No areas within {place.name}</span>
		{/if}
		</span>
	</div>
	<div style="grid-column: span {cols};">
		<h3>Data by topic <span class="title-inset muted">Census 2011</span></h3>
	</div>
	<div>
		<span class="text-bold">Median age</span>
		<br/>
		<span class="inline text-big">{place.data.agemed.value['2011'].all.toLocaleString()}</span>
		<span class="inline condensed text-small">years</span><br/>
		{#if overtime}
		<span class="text-small"><Em><span class="{changeClass(place.data.agemed.value['2011'].all - place.data.agemed.value['2001'].all)}">{changeStr(place.data.agemed.value['2011'].all - place.data.agemed.value['2001'].all, ' years', 0)}</span></Em> since 2001</span>
		{#if place.type != 'ew' && place.type != 'ctry'}
		<div class="text-small muted">{place.data.agemed.value_rank.change.all.toLocaleString()}{suffixer(place.data.agemed.value_rank.change.all)} largest increase of {place.count.toLocaleString()} {types[place.type].pl.toLowerCase()}</div>
		{/if}
		{:else}
		{#if place.type != 'ew' && place.type != 'ctry'}
		<span class="text-small"><Em>{adjectify(place.count, place.data.agemed.value_rank['2011'].all, ['older', 'younger'])}</Em> average age</span>
		<div class="text-small muted">{place.data.agemed.value_rank['2011'].all.toLocaleString()}{suffixer(place.data.agemed.value_rank['2011'].all)} oldest median age of {place.count.toLocaleString()} {types[place.type].pl.toLowerCase()}</div>
		{/if}
		{/if}
	</div>
	<div>
		<span class="text-bold">Age profile</span><br/>
		<div class="chart" style="height: 100px;">
			<ColChart data="{place && makeData(['age10yr', 'perc', '2011'])}" zKey="{overtime ? 'prev' : place.type != 'ew' ? 'ew' : null}"/>
		</div>
		{#if chartLabel}
		<div class="text-small muted"><li class="line"></li> {chartLabel}</div>
		{/if}
	</div>
	<div>
		<span class="text-bold">Sex</span><br/>
		<StackedBarChart data="{place && makeData(['population', 'perc', '2011'])}" zKey="{overtime ? 'prev' : place.type != 'ew' ? 'ew' : null}" label={chartLabel}/>
	</div>
	<div>
		<span class="text-bold">Ethnicity</span><br/>
		<StackedBarChart data="{place && makeData(['ethnicity', 'perc', '2011'])}" zKey="{overtime ? 'prev' : place.type != 'ew' ? 'ew' : null}" label={chartLabel}/>
	</div>
	<div>
		<span class="text-bold">General health</span><br/>
		<StackedBarChart data="{place && makeData(['health', 'perc', '2011'])}" zKey="{overtime ? 'prev' : place.type != 'ew' ? 'ew' : null}" label={chartLabel}/>
	</div>
	<div>
		<span class="text-bold">Employment</span><br/>
		<StackedBarChart data="{place && makeData(['economic', 'perc', '2011'])}" zKey="{overtime ? 'prev' : place.type != 'ew' ? 'ew' : null}" label={chartLabel}/>
	</div>
	<div>
		<span class="text-bold">Travel to work</span><br/>
		<StackedBarChart data="{place && makeData(['travel', 'perc', '2011'])}" zKey="{overtime ? 'prev' : place.type != 'ew' ? 'ew' : null}" label={chartLabel}/>
	</div>
	<div>
		<span class="text-bold">Home ownership</span><br/>
		<StackedBarChart data="{place && makeData(['tenure', 'perc', '2011'])}" zKey="{overtime ? 'prev' : place.type != 'ew' ? 'ew' : null}" label={chartLabel}/>
	</div>
</div>
{/if}
</Section>

<ONSFooter/>

<style>
	a {
		color: rgb(0, 60, 87);
	}
	h3 {
		margin-top: 8px;
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
	.increase {
		color: darkgreen;
	}
	.increase::before {
		content: '▲';
		color: darkgreen;
	}
	.decrease {
		color: darkred;
	}
	.decrease::before {
		content: '▼';
		color: darkred;
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
	.title {
		display: inline-block;
		margin-top: -3px;
	}
	.text-right {
		text-align: right;
	}
	.float-right {
		float: right;
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
	.mtl {
		margin-top: 55px;
	}
	.mbs {
		margin-bottom: 10px;
	}
	.grid {
		display: grid;
		width: 100%;
		grid-gap: 10px;
		grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
		justify-content: stretch;
	}
	.title-inset {
		font-weight: normal;
		font-size: 13.6px;
	}
	#grid {
		grid-gap: 20px !important;
	}
	.chart {
		position: relative;
		width: 100%;
	}
	#map {
		grid-row: span 2;
		min-height: 400px;
	}
	</style>