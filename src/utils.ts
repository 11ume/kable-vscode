import { NodeEmitter } from "kable-core/lib/eventsDriver"

export const isPlainObject = (item: object): boolean => (typeof item === 'object' && !Array.isArray(item) && item !== null)
export const getDateNow = (): number => Math.floor(Date.now() / 1000)
export const removeVariables = (node: NodeEmitter, variables: string[]): Partial<NodeEmitter> => {
	const n = { ...node }
	Object.keys(n).forEach((key) => {
		if (variables.includes(key)) {
			delete n[key]
		}
	})

	return n
}