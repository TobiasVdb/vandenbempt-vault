// Stable diagnostic IDs; berth suffixes do not create a new vehicle type.
export const PLANE_TYPES = ['plane', 'cessna-195', 'tern', 'sf50', 'vl3', 'h125'];
export const BOAT_TYPES = ['lobster', 'open-21', 'cabin-evo-23', 'cabin-evo-25', 'cabin-28', 'cabin-32', 'open-28', 'open-32'];
export const HIGHLIGHTS = ['Brightshore', 'ADMIN cavern', 'Cloud House', 'Rocket room', 'Lava cave', 'Lake House', 'Mansion', 'Honolulu resort', 'Mayan temple', 'Airstrip', 'Blossom island', 'Village'];
export function vehicleType(id) {
	const type = typeof id === 'string' ? id.split('@')[0] : '';
	return PLANE_TYPES.includes(type) ? { kind:'plane', type } : BOAT_TYPES.includes(type) ? { kind:'boat', type } : null;
}
export function sanitizeActivity(value) {
	if (!value || typeof value !== 'object' || typeof value.airborne !== 'boolean') return null;
	return { airborne:value.airborne, highlight:HIGHLIGHTS.includes(value.highlight) ? value.highlight : null };
}
