import * as vscode from 'vscode'
import NodeItem from './tokes/nodeItem'
import kable from 'kable-core'
import { Kable } from 'kable-core/lib/kable'
import { NodeEmitter } from 'kable-core/lib/eventsDriver'
import { NODE_STATES } from 'kable-core/lib/node'
import { Assets } from './assets'
import { isObject } from './utils'
import fromUnixTime from 'date-fns/fromUnixTime'

interface CreateItemArgs {
    label: string
    ; icon: string
    ; contextValue?: string
    ; collapsibleState: vscode.TreeItemCollapsibleState
    ; children: NodeItem[];
}

export class NodesProvider implements vscode.TreeDataProvider<NodeItem> {
    _onDidChangeTreeData: vscode.EventEmitter<NodeItem> = new vscode.EventEmitter<NodeItem>()
    onDidChangeTreeData: vscode.Event<NodeItem>
    private items: Map<string, NodeItem>
    private nodes: Map<string, NodeEmitter>
    private node: Kable
    public isfreeze: boolean

    constructor(private _assets: Assets) {
        this.onDidChangeTreeData = this._onDidChangeTreeData.event
        this.items = new Map()
        this.nodes = new Map()
        this.node = kable('vscode-ext')
        this.isfreeze = false
        this.runNode()
    }

    public freeze(): void {
        this.isfreeze = !this.isfreeze
    }

    private refresh(): void {
        if (this.isfreeze) return
        this._onDidChangeTreeData.fire()
    }

    private nodeAdd(node: NodeEmitter, nodeItem: NodeItem): void {
        this.items.set(node.iid, nodeItem)
        this.nodes.set(node.iid, node)
    }

    private orderNodes(): void {
        this.items = new Map([...this.items.entries()].sort())
    }

    // toma los nodos que posean ids que ya se encuentran registras y los reemplaza por las nuevas iid
    private nodeOverwritte(id: string): void {
        const found: string[] = []
        this.nodes.forEach((item) => {
            if (item.id === id) found.push(item.iid)
        })

        found.forEach((i) => {
            this.nodes.delete(i)
            this.items.delete(i)
        })
    }

    // comprueba que los nodos sean los mismos, de ser asi, corrobora que su estado haya mutado
    private chechNodeState(n: NodeEmitter, node: NodeEmitter): boolean {
        if (n.iid === node.iid) {
            if (n.state !== node.state) this.refresh()
            else return true
        }

        return false
    }

    // se ejecuta siempre que los nodos ya esten registrados, osea todo el flujo va por aca las proximas veces, los nodos y reemplaza los ids duplicados
    private checkNodes(n: NodeEmitter, node: NodeEmitter, nodeItem: NodeItem): boolean {
        if (n.id === node.id) {
            this.nodeOverwritte(node.id)
            this.nodeAdd(node, nodeItem)
            this.orderNodes()
            this.refresh()
            return true
        }

        return false
    }

    private makeChildItemName(itemIsObj: boolean, node: NodeEmitter, key: string): string {
        return `${itemIsObj ? key : `${key}: `} ${itemIsObj ? '' : node[key]}`
    }

    private setNodeChildIcon(key: string, itemIsObj: boolean): string {
        if (key === 'time') return 'clock'
        return itemIsObj ? 'propExt' : 'prop'
    }

    private setNodeTimeStampToDate(node: NodeEmitter, key: string): Date {
        return fromUnixTime(node[key])
    }

    private createNodeChilds(node: NodeEmitter): NodeItem[] {
        const nodeChilds: NodeItem[] = []
        for (const key in node) {
            const itemIsObj = isObject(node[key])
            const icon = this.setNodeChildIcon(key, itemIsObj)
            let childs: NodeItem[] = []
            if (key === 'time') {
                node[key] = this.setNodeTimeStampToDate(node, key)
            }

            if (itemIsObj) {
                childs = this.createNodeChilds(node[key])
            }

            const nodeItem = this.createItem({
                label: this.makeChildItemName(itemIsObj, node, key)
                , icon
                , collapsibleState: itemIsObj
                    ? vscode.TreeItemCollapsibleState.Collapsed
                    : vscode.TreeItemCollapsibleState.None
                , children: childs
            })
            nodeChilds.push(nodeItem)
        }

        return nodeChilds
    }

    private async runNode(): Promise<void> {
        await this.node.up()
        this.node.suscribeAll((node) => {
            // create main items
            const nodeItem = this.createItem({
                label: node.id
                , contextValue: 'nodeTree'
                , icon: this.setNodeStateIcon(node.state)
                , collapsibleState: vscode.TreeItemCollapsibleState.Collapsed
                , children: this.createNodeChilds(node)
            })

            for (const n of this.nodes.values()) {
                if (this.chechNodeState(n, node)) return
                if (this.checkNodes(n, node, nodeItem)) return
            }

            this.nodeAdd(node, nodeItem)
            this.orderNodes()
            this.refresh()
        })
    }

    private setNodeStateIcon(state: NODE_STATES): string {
        let icon = ''
        switch (state) {
            case NODE_STATES.UP: {
                icon = 'nodeUp'
                break
            }
            case NODE_STATES.DOWN: {
                icon = 'nodeDown'
                break
            }
            case NODE_STATES.RUNNING: {
                icon = 'nodeRunning'
                break
            }
            case NODE_STATES.STOPPED: {
                icon = 'nodeStopped'
                break
            }
            case NODE_STATES.DOING_SOMETHING: {
                icon = 'nodeDoing'
                break
            }
        }

        return icon
    }

    private addItemIcon(node: NodeItem, key: string): NodeItem {
        if (!this._assets[key]) return null
        node.iconPath = {
            light: this._assets[key]
            , dark: this._assets[key]
        }

        return node
    }

    createItem({
        label
        , icon
        , contextValue
        , collapsibleState
        , children
    }: CreateItemArgs): NodeItem {
        const item = new NodeItem({ label, contextValue, collapsibleState, children })
        this.addItemIcon(item, icon)
        return item
    }

    getTreeItem(item: NodeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return item
    }

    async getChildren(item?: NodeItem): Promise<vscode.TreeItem[]> {
        if (item === undefined) {
            return Array.from(this.items.values())
        }

        return item.children
    }
}