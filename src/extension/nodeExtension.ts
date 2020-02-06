import kable from 'kable-core'
import { Kable, KableComposedOptions } from 'kable-core/lib/kable'

export default class NodeExtension {
	public readonly node: Kable
	constructor(id: string, options: KableComposedOptions = {}) {
		this.node = kable(id, { ...options, ignorable: true })
	}
}