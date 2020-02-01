
import * as vscode from 'vscode'
import { NodesProvider } from './provider'
import assets from './assets'

export function activate() {
    const nodesProvider = new NodesProvider(assets)
    vscode.window.registerTreeDataProvider('nodeViewer', nodesProvider)
}