import * as vscode from 'vscode'
import NodeItem from './tokes/nodeItem'
import fetch from 'node-fetch'
import { Assets } from './assets'

interface User {
	id: number,
	name: string,
	username: string,
	email: string,
	address: {
		street: string,
		suite: string,
		city: string,
		zipcode: string,
		geo: {
			lat: number,
			lng: number
		}
	},
	phone: string,
	website: string,
	company: {
		name: string,
		catchPhrase: string,
		bs: string
	}
}

async function getUser(index: number) {
	const url = `https://jsonplaceholder.typicode.com/users/${index}`
	const req = await fetch(url)
	const user: Promise<User> = await req.json()
	return user
}

export class NodesProvider implements vscode.TreeDataProvider<NodeItem> {
	_onDidChangeTreeData: vscode.EventEmitter<NodeItem> = new vscode.EventEmitter<NodeItem>()
	onDidChangeTreeData: vscode.Event<NodeItem>
	private items: NodeItem[]

	constructor(private _assets: Assets) {
		this.onDidChangeTreeData = this._onDidChangeTreeData.event
		this.items = []
		let index = 0
		setInterval(async () => {
			if (index > 5) index = 0
			const user = await getUser(++index)
			const ass = ['node_up', 'node_down']
			const item = this.createItem(user.name, index > 3 ? ass[0] : ass[1], vscode.TreeItemCollapsibleState.None)
			this.items.length = 0
			this.items.push(item)
			this._onDidChangeTreeData.fire()
		}, 2000)
	}

	getTreeItem(item: NodeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
		return item
	}

	async getChildren(item?: NodeItem) {
		if (item === undefined) {
			return this.items
		}

		return item.children
	}

	private createItem(label: string
		, icon: string
		, collapsibleState: vscode.TreeItemCollapsibleState
		, ...children: NodeItem[]) {
		const item = new NodeItem({ label, collapsibleState, children })
		this.addItemIcon(item, icon)
		return item
	}

	private addItemIcon(node: NodeItem, key: string) {
		if (!this._assets[key]) return null
		node.iconPath = {
			light: this._assets[key]
			, dark: this._assets[key]
		}

		return node
	}
}