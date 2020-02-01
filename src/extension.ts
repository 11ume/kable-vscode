
import * as vscode from 'vscode'
import { NodesProvider } from './provider'
import assets from './assets'

export function activate(): void {
    const nodesProvider = new NodesProvider(assets)
    vscode.window.registerTreeDataProvider('nodeViewer', nodesProvider)
    vscode.commands.registerCommand('extension.treeview.freeze', () => {
        nodesProvider.freeze()
    })
}