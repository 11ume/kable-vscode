import * as vscode from 'vscode'

export type Assets = {
	[key: string]: vscode.Uri;
}

export default {
	nodeChild: vscode.Uri.file(__dirname + '/../assets/node_child.svg')
	, node: vscode.Uri.file(__dirname + '/../assets/node.svg')
	, nodeUp: vscode.Uri.file(__dirname + '/../assets/node_up.svg')
	, nodeDown: vscode.Uri.file(__dirname + '/../assets/node_down.svg')
	, nodeRunning: vscode.Uri.file(__dirname + '/../assets/node_running.svg')
	, nodeStopped: vscode.Uri.file(__dirname + '/../assets/node_stopped.svg')
	, nodeDoing: vscode.Uri.file(__dirname + '/../assets/node_doing.svg')
	, prop: vscode.Uri.file(__dirname + '/../assets/prop.svg')
	, propExt: vscode.Uri.file(__dirname + '/../assets/prop_ext.svg')
	, clock: vscode.Uri.file(__dirname + '/../assets/clock.svg')
	, waiting: vscode.Uri.file(__dirname + '/../assets/waiting.gif')
}