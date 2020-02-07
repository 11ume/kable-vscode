import * as vscode from 'vscode'
import clipboardy from 'clipboardy'
import deepEqual from 'fast-deep-equal'
import fromUnixTime from 'date-fns/fromUnixTime'
import createIntervalHandler, { IntervalHandler } from 'interval-handler'
import { NodeEmitter } from 'kable-core/lib/eventsDriver'
import { NODE_STATES } from 'kable-core/lib/node'
import { Assets } from '../assets'
import { isPlainObject, getDateNow, removeVariables } from '../utils'
import NodeProviderItem from './nodeProviderItem'

interface CreateItemArgs {
    id?: string
    ; label?: string
    ; icon: string
    ; contextValue?: string
    ; collapsibleState: vscode.TreeItemCollapsibleState
    ; children?: NodeProviderItem[];
}

type TimeControl = {
    id: string
    ; iid: string
    ; state: NODE_STATES
    ; interval: IntervalHandler
    ; lastSeen: number
    ; nodeTimeout: number;
}

export class NodeProvider implements vscode.TreeDataProvider<NodeProviderItem> {
    _onDidChangeTreeData: vscode.EventEmitter<NodeProviderItem> = new vscode.EventEmitter<NodeProviderItem>()
    onDidChangeTreeData: vscode.Event<NodeProviderItem>
    public isPinned: boolean
    private items: Map<string, NodeProviderItem>
    private nodes: Map<string, NodeEmitter>
    private readonly timeControl: Map<string, TimeControl>
    private readonly nodeDefaultTimeout: number
    private readonly waitingItem: NodeProviderItem

    constructor(private assets: Assets) {
        this.onDidChangeTreeData = this._onDidChangeTreeData.event
        this.isPinned = false
        this.items = new Map()
        this.nodes = new Map()
        this.timeControl = new Map()
        this.nodeDefaultTimeout = 1000


        this.waitingItem = this.creteWaitingItem()
        this.addWaitingItem()
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
    private refresh(waiting = false): void {
        if (this.isPinned) return
        this.orderNodeTree()
        waiting && this.addWaitingItem()
        this._onDidChangeTreeData.fire()
    }

    private creteWaitingItem(): NodeProviderItem {
        const id = 'waiting'
        return this.createNodeItem({
            id
            , label: 'waiting for nodes'
            , icon: id
            , collapsibleState: vscode.TreeItemCollapsibleState.None
        })
    }

    private addWaitingItem(): void {
        this.items.set(this.waitingItem.id, this.waitingItem)
    }

    private addNode(node: NodeEmitter, nodeItem: NodeProviderItem): void {
        this.items.set(node.iid, nodeItem)
        this.nodes.set(node.iid, node)
    }

    private removeNodeItem(key: string): void {
        this.items.delete(key)
    }

    private removeLoadingItem(): void {
        this.removeNodeItem(this.waitingItem.id)
    }

    private removeNodeAndItem(id: string): void {
        this.items.delete(id)
        this.nodes.delete(id)
    }

    private orderNodeTree(): void {
        const sortNodes: Map<string, NodeEmitter> = new Map()
        const sortItems: Map<string, NodeProviderItem> = new Map()
        const nodes = Array.from(this.nodes.values())
        const sorted = nodes.reduce((pv, cv) => {
            pv.push(cv.id)
            return pv
        }, []).sort()

        sorted.forEach((nodeId) => {
            for (const [key, node] of this.nodes.entries()) {
                if (nodeId === node.id) {
                    const item = this.items.get(key)
                    sortNodes.set(key, node)
                    sortItems.set(key, item)
                }
            }
        })

        this.nodes = sortNodes
        this.items = sortItems
    }

    // cant exits diferents node iid whit same id, ej: when an node process is restarted
    private removeNodeAndItemById(id: string): void {
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
    private setNodeItemIcon(node: NodeProviderItem, key: string): NodeProviderItem {
        if (!this.assets[key]) return null
        node.iconPath = {
            light: this.assets[key]
            , dark: this.assets[key]
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
    }: CreateItemArgs): NodeProviderItem {
        const item = new NodeProviderItem({
            id
            , label
            , contextValue
            , collapsibleState
            , children
        })

        this.setNodeItemIcon(item, icon)
        return item
    }

    private createNodeTreeItemChilds(
        children: NodeProviderItem[]
        , isObject: boolean
        , node: NodeEmitter
        , key: string): NodeProviderItem {
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
        , nodeChilds: NodeProviderItem[]
        , node: NodeEmitter
        , key: string): NodeProviderItem[] {
        const nChilds = Array.from(nodeChilds)
        let children: NodeProviderItem[] = []
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
    private createNodeTreeChilds(node: NodeEmitter): NodeProviderItem[] {
        let nodeChilds: NodeProviderItem[] = []
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
    private createArrayNodeTreeChilds(node: NodeEmitter): NodeProviderItem[] {
        const nodeChilds: NodeProviderItem[] = []
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
    private createNodeTreeItems(node: NodeEmitter): NodeProviderItem {
        return this.createNodeItem({
            id: node.iid
            , label: node.id
            , contextValue: 'nodeTree'
            , icon: this.setNodeStateIcon(node.state)
            , collapsibleState: vscode.TreeItemCollapsibleState.Collapsed
            , children: this.createNodeTreeChilds(node)
        })
    }

    // any thinkgs can be normally variables
    private removeVariables(n: NodeEmitter, node: NodeEmitter): { partialN: Partial<NodeEmitter>; partialNode: Partial<NodeEmitter> } {
        const variables = ['event', 'rinfo', 'stateData']
        return {
            partialN: removeVariables(n, variables)
            , partialNode: removeVariables(node, variables)
        }
    }

    // Check if the nodes are registered, and check if any of your properties has mutated
    private checkAdvertisementNodeChanges(n: NodeEmitter, node: NodeEmitter): boolean {
        if (n.iid === node.iid) {
            const { partialN, partialNode } = this.removeVariables(n, node)
            if (deepEqual(partialN, partialNode)) return true
        }

        this.refresh()
        return false
    }

    // Is invoked after the first time a node is announced, to check and prevent duplicate nodes
    private checkAdvertisementNodeId(n: NodeEmitter, node: NodeEmitter, nodeItem: NodeProviderItem): boolean {
        if (n.id === node.id) {
            this.removeNodeAndItemById(node.id)
            this.addNode(node, nodeItem)
            this.refresh()
            return true
        }
        return false
    }

    // Is invoked in first time, when a not registered node is announced
    private addNewNodes(node: NodeEmitter, nodeItem: NodeProviderItem): void {
        this.addNode(node, nodeItem)
        this.refresh()
    }

    private checkNodeItemTimeoutControl(): void {
        for (const control of this.timeControl.values()) {
            const timeElapsed = Math.abs(control.lastSeen - getDateNow())
            const timeOut = Math.abs(control.nodeTimeout / 1000)
            if (timeElapsed >= timeOut) {
                if (control.state === NODE_STATES.DOWN) {
                    this.removeTimeoutControl(control.iid)
                    return
                }

                this.removeNodeAndItem(control.iid)
                this.removeTimeoutControl(control.iid)
                this.refresh()
            }
        }

        // if items is empty, start to waiting for nodes
        if (this.items.size < 1) {
            this.refresh(true)
        }
    }

    private removeTimeoutControl(iid: string): void {
        const controller = this.timeControl.get(iid)
        controller.interval.stop()
        this.timeControl.delete(iid)
    }

    private addNodeItemTimeoutControl(node: NodeEmitter): void {
        const control = this.timeControl.get(node.iid)
        if (control && node.state !== NODE_STATES.DOWN) {
            control.lastSeen = getDateNow()
            return
        }

        const nodeTimeout = node.adTime + this.nodeDefaultTimeout
        const interval = createIntervalHandler(nodeTimeout, () => {
            this.checkNodeItemTimeoutControl()
        })
        interval.start()
        this.timeControl.set(node.iid, {
            id: node.id
            , iid: node.iid
            , state: node.state
            , interval
            , nodeTimeout
            , lastSeen: getDateNow()
        })
    }

    public onChanges(node: NodeEmitter): void {
        this.removeLoadingItem()
        const nodeTreeItems = this.createNodeTreeItems(node)
        for (const n of this.nodes.values()) {
            this.addNodeItemTimeoutControl(node)
            if (this.checkAdvertisementNodeChanges(n, node)) return
            if (this.checkAdvertisementNodeId(n, node, nodeTreeItems)) return
        }

        this.addNewNodes(node, nodeTreeItems)
    }

    public getTreeItem(item: NodeProviderItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return item
    }

    public async getChildren(item?: NodeProviderItem): Promise<vscode.TreeItem[]> {
        if (item === undefined) {
            return Array.from(this.items.values())
        }
        return item.children
    }
}