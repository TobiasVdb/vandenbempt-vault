// Renderer-free scenery motion shared by the room server and solo clients.
export const BLIMP_RESPAWN = 300;
// Imported hull is 48 x 33 x 18 metres, centred at the motion origin.
export const BLIMP_SIZE = [ 25, 17, 25 ];
const vehicleHistory = new WeakMap();
export function createScenery( now = Date.now() ) { return { epoch: now, seconds: 0, blimps: [ { id: 'blimp-0', crash: null }, { id: 'blimp-1', crash: null } ], collisions: [] }; }
export function blimpPose( index, seconds, crash = null ) {
	if ( crash ) {
		const t = Math.max( 0, seconds - crash.time );
		const fall = 35 * ( t - 3.57 * ( 1 - Math.exp( - t / 3.57 ) ) );
		return { position: [ crash.position[ 0 ] + crash.velocity[ 0 ] * Math.min( t, 12 ), crash.position[ 1 ] - fall, crash.position[ 2 ] + crash.velocity[ 2 ] * Math.min( t, 12 ) ], yaw: crash.yaw, roll: Math.min( 0.8, t * 0.07 ), pitch: Math.min( 0.5, t * 0.05 ) };
	}
	const a = seconds * 3 / 265 * ( index ? - 1 : 1 ) + index * 2.4;
	const wobble = Math.sin( seconds / 95 + index * 5 ) * 24;
	const x = 430 + Math.cos( a ) * ( 265 + wobble ), z = - 1430 + Math.sin( a ) * ( 235 + wobble );
	const y = 158 + index * 5 + Math.sin( seconds / 53 + index ) * 6;
	return { position: [ x, y, z ], yaw: Math.atan2( - Math.sin( a ) * ( index ? - 1 : 1 ), Math.cos( a ) * ( index ? - 1 : 1 ) ), roll: 0, pitch: 0 };
}
// Closest relative point along a swept segment, in the combined ellipsoid's frame.
export function sweptContact( a0, a1, b0, b1, radii ) {
	const start = a0.map( ( x, i ) => ( x - b0[ i ] ) / radii[ i ] );
	const delta = a1.map( ( x, i ) => ( x - b1[ i ] ) / radii[ i ] - start[ i ] );
	const dd = delta.reduce( ( sum, x ) => sum + x * x, 0 );
	const t = dd ? Math.max( 0, Math.min( 1, - start.reduce( ( sum, x, i ) => sum + x * delta[ i ], 0 ) / dd ) ) : 0;
	return start.reduce( ( sum, x, i ) => sum + ( x + t * delta[ i ] ) ** 2, 0 ) <= 1;
}
export function aircraftRadius( id ) { return /^(h125|tern|vtol|sf50|vl3|plane)(@|$)/.test( id ) ? ( /^(tern|vtol)/.test( id ) ? 7 : id.startsWith( 'h125' ) ? 8 : 13 ) : 0; }
export function advanceScenery( state, seconds, vehicles = [] ) {
	const history = vehicleHistory.get( state ) || new Map(); vehicleHistory.set( state, history );
	const previous = state.seconds; state.seconds = Math.max( previous, seconds );
	for ( const b of state.blimps ) if ( b.crash && seconds - b.crash.time >= BLIMP_RESPAWN ) b.crash = null;
	state.collisions = state.collisions.filter( c => seconds - c.time < BLIMP_RESPAWN );
	const hit = ( b, index, aircraft = null ) => {
		if ( b.crash ) return;
		const p = blimpPose( index, seconds ), q = blimpPose( index, seconds - 0.1 );
		b.crash = { time: seconds, position: p.position, velocity: p.position.map( ( x, i ) => ( x - q.position[ i ] ) * 10 ), yaw: p.yaw };
		if ( aircraft ) state.collisions.push( { id: `${b.id}:${seconds}`, vehicle: aircraft, time: seconds } );
	};
	const b0 = state.blimps[ 0 ], b1 = state.blimps[ 1 ];
	if ( ! b0.crash && ! b1.crash && sweptContact( blimpPose( 0, previous ).position, blimpPose( 0, seconds ).position, blimpPose( 1, previous ).position, blimpPose( 1, seconds ).position, BLIMP_SIZE.map( r => r * 2 ) ) ) { hit( b0, 0 ); hit( b1, 1 ); }
	for ( const v of vehicles ) {
		const radius = aircraftRadius( v.id ); if ( !radius || !v.position ) continue;
		for ( const [ i, b ] of state.blimps.entries() ) {
			if ( b.crash || state.collisions.some( c => c.vehicle === v.id ) ) continue;
			const before = v.previous || history.get( v.id ) || v.position.map( ( x, k ) => x - ( v.velocity?.[ k ] || 0 ) * Math.max( 0, seconds - previous ) );
			// Horizontal envelope includes the hull in every heading; avoids misses on a turning ship.
			if ( sweptContact( blimpPose( i, previous ).position, blimpPose( i, seconds ).position, before, v.position, BLIMP_SIZE.map( r => r + radius ) ) ) hit( b, i, v.id );
		}
		history.set( v.id, v.position.slice() );
	}
	for ( const id of history.keys() ) if ( !vehicles.some( v => v.id === id ) ) history.delete( id );
	return state;
}
