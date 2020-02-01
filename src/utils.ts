export function isObject(item: object): boolean {
	return (typeof item === 'object' && !Array.isArray(item) && item !== null)
}
