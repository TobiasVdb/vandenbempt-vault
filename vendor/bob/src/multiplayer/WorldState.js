const clamp = ( v, a, b ) => Math.min( b, Math.max( a, v ) );
const finite = ( v ) => Number.isFinite( v );
const round = ( v, d = 3 ) => +v.toFixed( d );

export const WORLD_FIELDS = {
	timeOfDay: [ 0, 24 ], sunAzimuth: [ -180, 180 ], timeSpeed: [ 0, 1 ],
	wind: [ 0.5, 30 ], windDir: [ 0, 360 ], fetch: [ 5, 2000 ], chop: [ 0, 1.6 ], swell: [ 0, 2 ], whitecaps: [ 0, 1 ],
	surf: [ 0, 1.4 ], period: [ 5, 16 ], gamma: [ 0.5, 1.1 ], curl: [ 0, 1.5 ], spray: [ 0, 2 ], lip: [ 0, 1.5 ],
	clouds: [ 0, 1 ], cirrus: [ 0, 1 ], haze: [ 0, 4 ], shafts: [ 0, 3 ], air: [ 0, 2 ],
};

export function sanitizeWorldState( src ) {

	if ( ! src || typeof src !== 'object' ) return null;
	const out = {};
	for ( const [ key, [ min, max ] ] of Object.entries( WORLD_FIELDS ) ) {

		const v = Number( src[ key ] );
		if ( finite( v ) ) out[ key ] = round( clamp( v, min, max ) );

	}

	return Object.keys( out ).length ? out : null;

}

export function randomWorldState( rand = Math.random ) {

	const pick = ( a, b ) => a + ( b - a ) * rand();
	const sea = rand();
	const wind = pick( 3, 18 );
	return sanitizeWorldState( {
		timeOfDay: pick( 5.4, 19.2 ),
		sunAzimuth: pick( -25, 25 ),
		timeSpeed: 0,
		wind,
		windDir: pick( 0, 360 ),
		fetch: pick( 35, 1200 ),
		chop: pick( 0.7, 1.25 ),
		swell: pick( 0.25, 1.25 ),
		whitecaps: clamp( sea * 0.8 + wind / 45, 0.15, 0.95 ),
		surf: pick( 0.18, 0.85 ),
		period: pick( 7.5, 13.5 ),
		gamma: pick( 0.65, 0.9 ),
		curl: pick( 0.25, 1.1 ),
		spray: pick( 0.5, 1.45 ),
		lip: pick( 0.35, 1.15 ),
		clouds: pick( 0.05, 0.82 ),
		cirrus: pick( 0.15, 0.9 ),
		haze: pick( 0.55, 2.7 ),
		shafts: pick( 0.35, 1.8 ),
		air: pick( 0.25, 1.3 ),
	} );

}

export function sanitizeVehicleState( v ) {

	if ( ! v || typeof v !== 'object' || typeof v.id !== 'string' || ! /^[a-z0-9@-]{1,48}$/.test( v.id ) ) return null;
	const p = Array.isArray( v.position ) ? v.position.map( Number ) : null;
	const q = Array.isArray( v.quat ) ? v.quat.map( Number ) : null;
	if ( ! p || p.length !== 3 || ! p.every( ( n ) => finite( n ) && Math.abs( n ) <= 30000 ) ) return null;
	if ( ! q || q.length !== 4 || ! q.every( ( n ) => finite( n ) && Math.abs( n ) <= 1.01 ) ) return null;
	const motion = {};
	for ( const key of [ 'velocity', 'angular' ] ) {

		if ( v[ key ] === undefined ) continue;
		if ( ! Array.isArray( v[ key ] ) || v[ key ].length !== 3 || ! v[ key ].every( n => finite( n ) && Math.abs( n ) <= 1000 ) ) return null;
		motion[ key ] = v[ key ].map( n => round( n ) );

	}
	return {
		id: v.id,
		position: p.map( ( n ) => round( n ) ),
		quat: q.map( ( n ) => round( n, 5 ) ),
		...motion,
		kind: typeof v.kind === 'string' && /^[a-z0-9-]{1,16}$/.test( v.kind ) ? v.kind : 'left',
	};

}
