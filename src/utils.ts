export const isPlainObject = (item: object): boolean => (typeof item === 'object' && !Array.isArray(item) && item !== null)
export const getDateNow = (): number => Math.floor(Date.now() / 1000)
