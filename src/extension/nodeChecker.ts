import deepEqual from 'fast-deep-equal'
import { NodeEmitter } from 'kable-core/lib/eventsDriver'
import { removeVariables } from '../utils'

export default class NodeChecker {
	private removeVariables(n: NodeEmitter, node: NodeEmitter): { partialN: Partial<NodeEmitter>; partialNode: Partial<NodeEmitter> } {
		const variables = ['event', 'rinfo', 'stateData']
		return {
			partialN: removeVariables(n, variables)
			, partialNode: removeVariables(node, variables)
		}
	}

	public checkAdvertisementNodeChanges(n: NodeEmitter, node: NodeEmitter): boolean {
		if (n.iid === node.iid) {
			const { partialN, partialNode } = this.removeVariables(n, node)
			if (deepEqual(partialN, partialNode)) return true
		}

		return false
	}

	public checkAdvertisementNodeId(n: NodeEmitter, node: NodeEmitter): boolean {
		if (n.id === node.id) return true
		return false
	}
}