import kable from 'kable-core'
import { Kable } from 'kable-core/lib/kable'

export class KableNodeExtension {
	private readonly nodeId: string
	public readonly node: Kable
	constructor() {
		this.nodeId = 'kable-vscode-ext'
		this.node = kable(this.nodeId, { ignorable: true })
	}
}