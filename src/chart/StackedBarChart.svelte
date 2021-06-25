<script>
  import StackedBar from './StackedBar.svelte';
	import Legend from './Legend.svelte';
	export let data;
	export let height = 80;
	export let xKey = "x";
	export let yKey = "y";
	export let zKey = "ew";
	export let colors = ['#206095', '#A8BD3A', '#003C57', '#27A0CC', '#118C7B', '#F66068', '#746CB1', '#22D0B6', 'lightgrey'];
	export let decimals = null;
</script>

<div class="chart" style="height: {zKey ? height * 0.75 : height}px;">
	<StackedBar {data} {yKey} {colors}/>
</div>
{#if zKey}
<div class="chart" style="height: {height * 0.25}px;">
	<StackedBar {data} yKey={zKey} {colors}/>
</div>
{/if}
<div class="legend">
	<Legend {data} {xKey} {yKey} {zKey} {decimals} {colors}/>
</div>

<style>
	.chart {
		width: 100%;
	}
  .chart + .chart {
    border-top: 1px solid white;
  }
	.legend {
		width: 100%;
		margin-top: 3px;
	}
</style>