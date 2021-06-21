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
	]
}

export let mapSources = {
	crd: '',
	ward: ''
}

export let mapLayers = {
	ctry: {
		source: 'crd',
		layer: '',
		code: '',
		name: ''
	},
	ward: {
		source: 'ward',
		layer: '',
		code: '',
		name: ''
	}
}