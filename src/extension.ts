
import * as vscode from 'vscode'
import { NodesProvider } from './provider'
import assets from './assets'

export function activate(): void {
    const nodesProvider = new NodesProvider(assets)
    vscode.window.registerTreeDataProvider('nodeViewer', nodesProvider)
    vscode.commands.registerCommand('extension.treeview.pin', () => {
        nodesProvider.pin(true)
    })

    vscode.commands.registerCommand('extension.treeview.unpin', () => {
        nodesProvider.pin(false)
    })

    vscode.commands.registerCommand('extension.treeview.copyItemInfoToClipboard', (payload) => {
        nodesProvider.copyItemInfoToClipboard(payload.id)
    })
}