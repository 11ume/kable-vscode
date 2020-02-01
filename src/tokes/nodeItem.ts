import * as vscode from 'vscode'

interface INodeItem {
	label?: string
	, collapsibleState?: vscode.TreeItemCollapsibleState
	, command?: vscode.Command
	, children?: vscode.TreeItem[]
}

export default class NodeItem extends vscode.TreeItem {
	children?: vscode.TreeItem[]
	command?: vscode.Command
	collapsibleState?: vscode.TreeItemCollapsibleState

	constructor({ label, children, command, collapsibleState }: INodeItem) {
		super(
			label,
			children === undefined ? vscode.TreeItemCollapsibleState.None :
				vscode.TreeItemCollapsibleState.Expanded)
		this.label = label
		this.children = children
		this.command = command
		this.collapsibleState = collapsibleState
	}
}