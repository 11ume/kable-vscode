import * as vscode from 'vscode'

interface NodeItemArgs {
	id?: string
	; label?: string
	; command?: vscode.Command
	; contextValue?: string
	; collapsibleState?: vscode.TreeItemCollapsibleState
	; children?: vscode.TreeItem[];
}

export default class NodeItem extends vscode.TreeItem {
	command?: vscode.Command
	contextValue?: string
	collapsibleState?: vscode.TreeItemCollapsibleState
	children?: vscode.TreeItem[]

	constructor({
		id
		, label
		, children
		, command
		, contextValue
		, collapsibleState }: NodeItemArgs) {
		super(
			label,
			children === undefined ? vscode.TreeItemCollapsibleState.None :
				vscode.TreeItemCollapsibleState.Expanded)

		this.id = id
		this.label = label
		this.children = children
		this.command = command
		this.contextValue = contextValue
		this.collapsibleState = collapsibleState
	}
}