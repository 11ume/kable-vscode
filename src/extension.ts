import * as vscode from 'vscode'
import { NodeEmitter } from 'kable-core/lib/eventsDriver'
import { NodeProvider } from './provider/provider'
import NodeExtension from './extension/nodeExtension'
import OutputChannel from './extension/outputChannel'
import assets from './assets'

async function startNodeExtesion(
    outputChannel: OutputChannel
    , nodeExtension: NodeExtension
    , nodeProvider: NodeProvider
): Promise<void> {
    try {
        nodeExtension.node.up()
        const providerSuscriber = (node: NodeEmitter): void => {
            nodeProvider.onChanges.call(nodeProvider, node)
        }
        nodeExtension.node.suscribeAll(providerSuscriber)
    } catch (err) {
        outputChannel.appendLineError(err)
    }
}

export async function activate(): Promise<void> {
    const nodeExtension = new NodeExtension('kable-vscode-extension')
    const outputChannel = new OutputChannel('kable')
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

    startNodeExtesion(outputChannel, nodeExtension, nodeProvider)
}