import * as vscode from 'vscode'

export type Assets = {
	[key: string]: vscode.Uri
}

export default {
	gif: vscode.Uri.file(__dirname + '/../assets/test.gif')
	, child: vscode.Uri.file(__dirname + '/../assets/child.svg')
	, node_up: vscode.Uri.file(__dirname + '/../assets/node_up.svg')
	, node_down: vscode.Uri.file(__dirname + '/../assets/node_down.svg')
	, node_running: vscode.Uri.file(__dirname + '/../assets/node_running.svg')
	, node_stopped: vscode.Uri.file(__dirname + '/../assets/node_stopped.svg')
	, node_doing: vscode.Uri.file(__dirname + '/../assets/node_doing.svg')
	, prop: vscode.Uri.file(__dirname + '/../assets/prop.svg')
	, prop_ext: vscode.Uri.file(__dirname + '/../assets/prop_ext.svg')
}