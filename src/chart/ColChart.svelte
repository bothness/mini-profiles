<script>
	import { LayerCake, Svg, Html } from 'layercake';
	import { scaleBand } from 'd3-scale';
	import Col from './Col.svelte';
	import AxisX from './AxisX.svelte';
	
	export let data;
	export let suffix = '%';
	export let decimals = 0;
	export let fill = '#206095';
	
	const xKey = 'x';
	const yKey = 'y';
	
	$: domain = data.map(d => d[xKey]);
	$: formatVal = d => d.toFixed(decimals) + suffix;
	
</script>

<style>
	.chart-container {
		width: 100%;
		height: 100%;
	}
</style>

<div class="chart-container">
	<LayerCake
		padding={{ top: 15, right: 0, bottom: 20, left: 0 }}
		x={xKey}
		y={yKey}
		xScale={scaleBand().paddingInner([0.02]).round(true)}
		xDomain={domain}
		yDomain={[0, null]}
		data={data}
	>
		<Svg>
			<Col {fill} {formatVal}/>
			<AxisX
				gridlines={false}
			/>
		</Svg>

	</LayerCake>
</div>