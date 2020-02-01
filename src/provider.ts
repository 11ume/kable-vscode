import * as vscode from 'vscode'
import NodeItem from './tokes/nodeItem'
import kable from 'kable-core'
import { Kable } from 'kable-core/lib/kable'
import { NodeEmitter } from 'kable-core/lib/eventsDriver'
import { Assets } from './assets'
import { NODE_STATES } from 'kable-core/lib/node'

function isObject(item: object) {
    return (typeof item === 'object' && !Array.isArray(item) && item !== null)
}

export class NodesProvider implements vscode.TreeDataProvider<NodeItem> {
    _onDidChangeTreeData: vscode.EventEmitter<NodeItem> = new vscode.EventEmitter<NodeItem>()
    onDidChangeTreeData: vscode.Event<NodeItem>
    private items: Map<string, NodeItem>
    private nodes: Map<string, NodeEmitter>
    private node: Kable

    constructor(private _assets: Assets) {
        this.onDidChangeTreeData = this._onDidChangeTreeData.event
        this.items = new Map()
        this.nodes = new Map()
        this.node = kable('vscode-ext')
        this.runNode()
    }

    private nodeAdd(node: NodeEmitter, nodeItem: NodeItem) {
        this.items.set(node.iid, nodeItem)
        this.nodes.set(node.iid, node)
    }

    private orderNodes() {
        this.items = new Map([...this.items.entries()].sort())
    }

    private nodeOverwritte(id: string) {
        const found: string[] = []
        this.nodes.forEach((item) => {
            if (item.id === id) found.push(item.iid)
        })

        found.forEach((i) => {
            this.nodes.delete(i)
            this.items.delete(i)
        })
    }

    private refresh() {
        this._onDidChangeTreeData.fire()
    }

    // compruba que los nodos sean los mismos y si son asi compruba que su estado haya cambiado
    private chechNodeState(n: NodeEmitter, node: NodeEmitter) {
        if (n.iid === node.iid) {
            if (n.state !== node.state) this.refresh()
            else return true
        }

        return false
    }

    // se ejecuta siempre que ya esten registrados, osea todo el flujo va por aca las proximas veces, los nodos y reemplaza los ids duplicados
    private checkNodes(n: NodeEmitter, node: NodeEmitter, nodeItem: NodeItem) {
        if (n.id === node.id) {
            this.nodeOverwritte(node.id)
            this.nodeAdd(node, nodeItem)
            this.orderNodes()
            this.refresh()
            return true
        }

        return false
    }

    private createNodeChilds(node: NodeEmitter) {
        const nodeChilds: NodeItem[] = []
        Object.keys(node).forEach((key) => {
            const itemIsObj = isObject(node[key])
            const icon = itemIsObj ? 'prop_ext' : 'prop'
            const nodeItem = this.createItem(`${itemIsObj ? key : `${key}: `} ${itemIsObj ? '' : node[key]}`
                , icon
                , itemIsObj
                    ? vscode.TreeItemCollapsibleState.Collapsed
                    : vscode.TreeItemCollapsibleState.None)
            nodeChilds.push(nodeItem)
        })

        return nodeChilds
    }

    private async runNode() {
        await this.node.up()
        this.node.suscribeAll((node) => {
            const nodeItem = this.createItem(node.id
                , this.setNodeStateIcon(node.state)
                , vscode.TreeItemCollapsibleState.Collapsed
                , ...this.createNodeChilds(node))
            for (const n of this.nodes.values()) {
                if (this.chechNodeState(n, node)) return
                if (this.checkNodes(n, node, nodeItem)) return
            }

            this.nodeAdd(node, nodeItem)
            this.orderNodes()
            this.refresh()
        })
    }

    private setNodeStateIcon(state: NODE_STATES) {
        let icon = ''
        switch (state) {
            case NODE_STATES.UP: {
                icon = 'node_up'
                break
            }
            case NODE_STATES.DOWN: {
                icon = 'node_down'
                break
            }
            case NODE_STATES.RUNNING: {
                icon = 'node_running'
                break
            }
            case NODE_STATES.STOPPED: {
                icon = 'node_stopped'
                break
            }
            case NODE_STATES.DOING_SOMETHING: {
                icon = 'node_doing'
                break
            }
        }

        return icon
    }

    private addItemIcon(node: NodeItem, key: string) {
        if (!this._assets[key]) return null
        node.iconPath = {
            light: this._assets[key]
            , dark: this._assets[key]
        }

        return node
    }

    createItem(label: string
        , icon: string
        , collapsibleState: vscode.TreeItemCollapsibleState
        , ...children: NodeItem[]) {
        const item = new NodeItem({ label, collapsibleState, children })
        this.addItemIcon(item, icon)
        return item
    }

    getTreeItem(item: NodeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return item
    }

    async getChildren(item?: NodeItem) {
        if (item === undefined) {
            return Array.from(this.items.values())
        }

        return item.children
    }

}