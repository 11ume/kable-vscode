import * as vscode from 'vscode'

export default class OutputChannel {
	private readonly channel: vscode.OutputChannel
	constructor(id: string) {
		this.channel = vscode.window.createOutputChannel(id)
	}

	appendLine(value: string): void {
		this.channel.appendLine(value)
	}

	appendLineError(value: string): void {
		this.channel.appendLine(value)
	}
}