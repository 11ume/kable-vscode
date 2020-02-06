import { NodeEmitter } from 'kable-core/lib/eventsDriver';
import * as vscode from 'vscode'
import { NodeProvider } from './provider'
import { KableNodeExtension } from './kableNodeExtension'
import assets from './assets'

export async function activate(): Promise<void> {
    const { node } = new KableNodeExtension()
    const nodeProvider = new NodeProvider(assets)
    vscode.window.registerTreeDataProvider('nodeViewer', nodeProvider)
    vscode.commands.registerCommand('extension.treeview.pin', () => {
        nodeProvider.pin(true)
    })

    vscode.commands.registerCommand('extension.treeview.unpin', () => {
        nodeProvider.pin(false)
    })

    vscode.commands.registerCommand('extension.treeview.copyItemInfoToClipboard', (payload) => {
        nodeProvider.copyItemInfoToClipboard(payload.id)
    })

    const out = vscode.window.createOutputChannel('kable')

    await node.up()
    const providerSuscriber = (node: NodeEmitter): void => {
        nodeProvider.onChanges.call(nodeProvider, node)
        out.appendLine(`${node.id} ${node.state}`)
    }

    node.suscribeAll(providerSuscriber)
}