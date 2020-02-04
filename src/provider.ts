import * as vscode from 'vscode'
import NodeItem from './tokes/nodeItem'
import kable from 'kable-core'
import { Kable } from 'kable-core/lib/kable'
import { NodeEmitter } from 'kable-core/lib/eventsDriver'
import { NODE_STATES } from 'kable-core/lib/node'
import { Assets } from './assets'
import { isPlainObject } from './utils'
import fromUnixTime from 'date-fns/fromUnixTime'
import clipboardy from 'clipboardy'
import deepEqual from 'fast-deep-equal'

interface CreateItemArgs {
    id?: string
    ; label: string
    ; icon: string
    ; contextValue?: string
    ; collapsibleState: vscode.TreeItemCollapsibleState
    ; children?: NodeItem[];
}

export class NodesProvider implements vscode.TreeDataProvider<NodeItem> {
    _onDidChangeTreeData: vscode.EventEmitter<NodeItem> = new vscode.EventEmitter<NodeItem>()
    onDidChangeTreeData: vscode.Event<NodeItem>
    private items: Map<string, NodeItem>
    private nodes: Map<string, NodeEmitter>
    private node: Kable
    private nodeId: string
    public isPinned: boolean

    constructor(private _assets: Assets) {
        this.onDidChangeTreeData = this._onDidChangeTreeData.event
        this.items = new Map()
        this.nodes = new Map()
        this.nodeId = 'kable-vscode-ext'
        this.node = kable(this.nodeId, { ignorable: true })
        this.isPinned = false
        this.runNode()
    }

    public copyItemInfoToClipboard(iid: string): void {
        for (const node of this.nodes.values()) {
            if (node.iid === iid) {
                clipboardy.write(JSON.stringify(node))
                return
            }
        }
    }

    // Pin up the node tree 
    public pin(pin: boolean): void {
        this.isPinned = pin
    }

    // Refresh the tree node items status
    private refresh(): void {
        if (this.isPinned) return
        this._onDidChangeTreeData.fire()
    }

    private addNode(node: NodeEmitter, nodeItem: NodeItem): void {
        this.items.set(node.iid, nodeItem)
        this.nodes.set(node.iid, node)
    }

    private orderNodeTree(): void {
        const items = Array.from(this.items.keys()).sort()
        for (const key of items) {
            const pre = this.items.get(key)
            this.items.set(key, pre)
        }
    }

    // Replace the nodes with id that are already registered
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


    private setNodeTimeStampToDate(node: NodeEmitter, key: string): Date {
        return fromUnixTime(node[key])
    }

    private setChildItemLabel(isObject: boolean, node: NodeEmitter, key: string): string {
        return `${isObject ? key : `${key}:`} ${isObject ? '' : node[key]}`
    }

    // Select an custom node child icon for node tree properties
    private setChildItemIcon(key: string, itemIsObj: boolean): string {
        if (key === 'time') return 'clock'
        return itemIsObj ? 'propExt' : 'prop'
    }

    // Select an custom node icon, the colors of the icons vary depending on the state of the node
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

    // Assign an icon to a tree item
    private setNodeItemIcon(node: NodeItem, key: string): NodeItem {
        if (!this._assets[key]) return null
        node.iconPath = {
            light: this._assets[key]
            , dark: this._assets[key]
        }

        return node
    }

    // Crate a new item of tree menu
    private createNodeItem({
        id
        , label
        , icon
        , contextValue
        , collapsibleState
        , children
    }: CreateItemArgs): NodeItem {
        const item = new NodeItem({ id, label, contextValue, collapsibleState, children })
        this.setNodeItemIcon(item, icon)
        return item
    }

    private createNodeTreeItemChilds(
        children: NodeItem[]
        , isObject: boolean
        , node: NodeEmitter
        , key: string): NodeItem {
        const icon = this.setChildItemIcon(key, isObject)
        const item = this.createNodeItem({
            label: this.setChildItemLabel(isObject, node, key)
            , icon
            , collapsibleState: isObject
                ? vscode.TreeItemCollapsibleState.Collapsed
                : vscode.TreeItemCollapsibleState.None
            , children
        })

        return item
    }

    private handleNodeTreeChilds(isObject: boolean
        , nodeChilds: NodeItem[]
        , node: NodeEmitter
        , key: string): NodeItem[] {
        const nChilds = Array.from(nodeChilds)
        let children: NodeItem[] = []
        if (key === 'time') {
            node[key] = this.setNodeTimeStampToDate(node, key)
        }

        if (Array.isArray(node[key])) {
            children = this.createArrayNodeTreeChilds(node[key])
            const item = this.createNodeTreeItemChilds(
                children
                , isObject
                , node
                , key)
            nChilds.push(item)
            return nChilds
        }

        if (isObject) {
            children = this.createNodeTreeChilds(node[key])
            const item = this.createNodeTreeItemChilds(
                children
                , isObject
                , node
                , key)
            nChilds.push(item)
            return nChilds
        }

        // handle object properties
        const item = this.createNodeTreeItemChilds(
            children
            , isObject
            , node
            , key)

        nChilds.push(item)
        return nChilds
    }

    // Crate childs items of array (icon) <object> -> keys
    private createNodeTreeChilds(node: NodeEmitter): NodeItem[] {
        let nodeChilds: NodeItem[] = []
        for (const key in node) {
            const isObject = isPlainObject(node[key]) || Array.isArray(node[key])
            nodeChilds = this.handleNodeTreeChilds(isObject
                , nodeChilds
                , node
                , key)
        }
        return nodeChilds
    }

    // Crate childs items of array (icon) <Array> -> values
    private createArrayNodeTreeChilds(node: NodeEmitter): NodeItem[] {
        const nodeChilds: NodeItem[] = []
        for (const key in node) {
            const icon = 'node'
            const item = this.createNodeItem({
                label: node[key]
                , icon
                , collapsibleState: vscode.TreeItemCollapsibleState.None
            })
            nodeChilds.push(item)
        }

        return nodeChilds
    }

    // Crate main tree items (icon) label -> childs
    private createNodeTreeItem(node: NodeEmitter): NodeItem {
        return this.createNodeItem({
            id: node.iid
            , label: node.id
            , contextValue: 'nodeTree'
            , icon: this.setNodeStateIcon(node.state)
            , collapsibleState: vscode.TreeItemCollapsibleState.Collapsed
            , children: this.createNodeTreeChilds(node)
        })
    }

    // Check if the nodes are registered, and check if any of your properties has mutated
    private checkAdvertisementNodeState(n: NodeEmitter, node: NodeEmitter): boolean {
        if (n.iid === node.iid) {
            if (!deepEqual(n, node)) this.refresh()
            else return true
        }

        return false
    }

    // Is invoked after the first time a node is announced, to check and prevent duplicate nodes
    private checkAdvertisementNode(n: NodeEmitter, node: NodeEmitter, nodeItem: NodeItem): boolean {
        if (n.id === node.id) {
            this.nodeOverwritte(node.id)
            this.addNode(node, nodeItem)
            this.orderNodeTree()
            this.refresh()
            return true
        }

        return false
    }

    // Is invoked in first time, when a not registered node is announced
    private addNodesFirstAdvertisement(node: NodeEmitter, nodeItem: NodeItem): void {
        this.addNode(node, nodeItem)
        this.orderNodeTree()
        this.refresh()
    }

    private async runNode(): Promise<void> {
        await this.node.up()
        this.node.suscribeAll((node) => {
            const nodeItem = this.createNodeTreeItem(node)
            for (const n of this.nodes.values()) {
                if (this.checkAdvertisementNodeState(n, node)) return
                if (this.checkAdvertisementNode(n, node, nodeItem)) return
            }

            this.addNodesFirstAdvertisement(node, nodeItem)
        })
    }

    public getTreeItem(item: NodeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return item
    }

    public async getChildren(item?: NodeItem): Promise<vscode.TreeItem[]> {
        if (item === undefined) {
            return Array.from(this.items.values())
        }

        return item.children
    }
}