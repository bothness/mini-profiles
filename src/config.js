export const urls = {
		options: 'https://raw.githubusercontent.com/ONSvisual/census-data/main/csv/lists/places_2020.csv',
		places: 'https://raw.githubusercontent.com/ONSvisual/census-data/main/json/place/',
		quantiles: 'https://raw.githubusercontent.com/ONSvisual/census-data/main/json/quantiles/quartiles_'
};

export const types = {
	ew: {name: '', pl: ''},
	wd: {name: 'Ward', pl: 'Wards'},
	lad: {name: 'District', pl: 'Districts'},
	rgn: {name: 'Region', pl: 'Regions'},
	ctry: {name: 'Country', pl: 'Countries'}
};

export const codes = {
	age10yr: [
		{code: '0-9'},
		{code: '10-19'},
		{code: '20-29'},
		{code: '30-39'},
		{code: '40-49'},
		{code: '50-59'},
		{code: '60-69'},
		{code: '70plus', label: '70+'}
	],
	economic: [
		{code: 'employee'},
		{code: 'self-employed'},
		{code: 'student', label: 'student (employed)'},
		{code: 'unemployed'},
		{code: 'inactive'}
	],
	ethnicity: [
		{code: 'white'},
		{code: 'asian'},
		{code: 'black'},
		{code: 'mixed'},
		{code: 'other'}
	],
	population: [
		{code: 'female'},
		{code: 'male'}
	],
	health: [
		{code: 'good'},
		{code: 'fair'},
		{code: 'bad'}
	]
};

export const mapSources = {
	crd: {
		id: 'crd',
		promoteId: 'areacd',
		type: 'vector',
		url: 'https://cdn.ons.gov.uk/maptiles/administrative/authorities/v1/boundaries/{z}/{x}/{y}.pbf',
		maxzoom: 12
	},
	wd: {
		id: 'wd',
		promoteId: 'areacd',
		type: 'vector',
		url: 'https://cdn.ons.gov.uk/maptiles/administrative/wards/v1/boundaries/{z}/{x}/{y}.pbf',
		minzoom: 6,
		maxzoom: 12
	}
};

export const mapLayers = {
	ctry: {
		source: 'crd',
		sourceLayer: 'region',
		code: 'areacd',
		name: 'areanm',
		filter: [
			"all",
			["==", "nation", "true"],
			["in", "country", "E", "W"]
		]
	},
	rgn: {
		source: 'crd',
		sourceLayer: 'region',
		code: 'areacd',
		name: 'areanm',
		filter: [
			"all",
			["==", "region", "true"],
			["==", "country", "E"]
		]
	},
	lad: {
		source: 'crd',
		sourceLayer: 'authority',
		code: 'areacd',
		name: 'areanm',
		filter: [
			"all",
			["==", "lower", "true"],
			["in", "country", "E", "W"]
		]
	},
	wd: {
		source: 'wd',
		sourceLayer: 'ward',
		code: 'areacd',
		name: 'areanm',
		filter: ["in", "country", "E", "W"]
	}
};

export const mapPaint = {
	fill: {
		'fill-color': 'rgba(255,255,255,0)',
		'fill-opacity': 0
	},
	line: {
		'line-color': 'rgba(255,255,255,0)',
		'line-width': 1,
		'line-opacity': 0
	},
	'fill-active': {
		'fill-color': [
			'case',
			['==', ['feature-state', 'selected'], true], 'rgba(255,255,255,0)',
			'grey'
		],
		'fill-opacity': [
			'case',
			['==', ['feature-state', 'hovered'], true], 0.3,
			['==', ['feature-state', 'highlighted'], true], 0.1,
			0
		]
	},
	'fill-self': {
		'fill-color': [
			'case',
			['==', ['feature-state', 'selected'], true], 'rgb(17,140,123)',
			'grey'
		],
		'fill-opacity': [
			'case',
			['==', ['feature-state', 'hovered'], true], 0.3,
			0.1
		]
	},
	'fill-child': {
		'fill-color': [
			'case',
			['==', ['feature-state', 'highlighted'], true], 'rgb(17,140,123)',
			'rgba(255,255,255,0)'
		],
		'fill-opacity': [
			'case',
			['==', ['feature-state', 'hovered'], true], 0.3,
			['==', ['feature-state', 'highlighted'], true], 0.1,
			0
		]
	},
	'line-active': {
		'line-color': [
			'case',
			['==', ['feature-state', 'selected'], true], 'rgb(17,140,123)',
			'grey'
		],
		'line-width': 2,
		'line-opacity': 1
	},
	'line-self': {
		'line-color': 'rgb(17,140,123)',
		'line-width': 2,
		'line-opacity': [
			'case',
			['==', ['feature-state', 'selected'], true], 1,
			0
		]
	},
	'line-child': {
		'line-color': 'rgb(17,140,123)',
		'line-width': 1,
		'line-opacity': [
			'case',
			['==', ['feature-state', 'highlighted'], true], 1,
			0
		]
	}
};