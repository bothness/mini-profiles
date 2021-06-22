<script>
	export let data;
	export let xKey = "x";
	export let yKey = "y";
	export let parentKey = "ew";
	export let colors = ['#206095', '#A8BD3A', '#003C57', '#27A0CC', '#118C7B', '#F66068', '#746CB1', '#22D0B6', 'lightgrey'];
	export let textColor = '#555';
	export let mutedColor = '#999';
	export let decimals = 0;
	export let round = false;
	
	$: sum = data.map(d => d[yKey]).reduce((a, b) => a + b, 0);
	$: psum = data.map(d => d[parentKey]).reduce((a, b) => a + b, 0);
</script>

<ul>
	{#each data as item, i}
	<li style="color: {textColor}">
		<div class="bullet" class:round style="background-color: {colors[i]}"/>
		{item[xKey]} {((item[yKey] / sum) * 100).toFixed(decimals)}% <span style="color: {mutedColor}">({((item[parentKey] / psum) * 100).toFixed(decimals)}%)</span>
	</li>
	{/each}
</ul>

<style>
	ul {
		margin: 0;
		padding: 0;
		font-size: 0.85em;
		text-transform: capitalize;
	}
	li {
		display: inline-block;
		margin-right: 10px;
	}
	.bullet {
  	height: 15px;
  	width: 15px;
		display: inline-block;
		transform: translate(0, 2px);
	}
	.round {
		border-radius: 50%;
		transform: scale(0.9);
		transform: translate(0, 3px);
	}
</style>