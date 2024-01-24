import * as vscode from 'vscode';
import type { ArduinoContext } from 'vscode-arduino-api';
import { spawn } from 'child_process';

const writeEmitter = new vscode.EventEmitter<string>();
let writerReady: boolean = false;

export function activate(context: vscode.ExtensionContext) {
	const arduinoContext: ArduinoContext = vscode.extensions.getExtension(
		'dankeboy36.vscode-arduino-api'
	)?.exports;
	if (!arduinoContext) {
		return;
	}

	function makeTerminal(title: string) {
		let w = vscode.window.terminals.find((w) => ((w.name === title) && (w.exitStatus === undefined)));
		if (w !== undefined) {
			w.show(false);
			return;
		}

		const pty = {
			onDidWrite: writeEmitter.event,
			open: () => { writerReady = true; },
			close: () => { writerReady = false; },
			handleInput: () => { }
		};
		const terminal = (<any>vscode.window).createTerminal({ name: title, pty });
		terminal.show();
	}

	async function runCommand(exe: string, opts: any[]) {
		const cmd = spawn(exe, opts);
		for await (const chunk of cmd.stdout) {
			log(String(chunk));
		}
		for await (const chunk of cmd.stderr) {
			log(String(chunk));
		}
		let exitCode = await new Promise((resolve, reject) => {
			cmd.on('close', resolve);
		});
		return exitCode;
	}

	function log(str: string) {
		writeEmitter.fire(str + '\r\n');
		console.log(str);
	}

	context.subscriptions.push(vscode.commands.registerCommand('arduino-esp32-erase.erase', async () => {
		makeTerminal("ESP32 erase flash");

		let cnt = 0;
		while (!writerReady) {
			if (cnt++ >= 50) {
				vscode.window.showErrorMessage("Unable to open upload terminal");
				return;
			}
			await new Promise(resolve => setTimeout(resolve, 100));
		}

		/*
		log('=============================================');
		log('arduinoContext? ' + JSON.stringify(arduinoContext));
		log('arduinoContext?.config ' + arduinoContext?.config);
		log('arduinoContext?.currentSketch ' + arduinoContext?.currentSketch);
		log('arduinoContext?.openedSketches ' + arduinoContext?.openedSketches);
		log('arduinoContext?.boardDetails ' + JSON.stringify(arduinoContext?.boardDetails));
		log('arduinoContext?.compileSummary ' + arduinoContext?.compileSummary);
		log('arduinoContext?.dataDirPath ' + arduinoContext?.dataDirPath);
		log('arduinoContext?.fqbn ' + arduinoContext?.fqbn);
		log('arduinoContext?.port?.address ' + arduinoContext?.port?.address);
		log('arduinoContext?.port?.hardwareId ' + arduinoContext?.port?.hardwareId);
		log('arduinoContext?.port?.label ' + arduinoContext?.port?.label);
		log('arduinoContext?.port?.properties ' + JSON.stringify(arduinoContext?.port?.properties));
		log('arduinoContext?.port?.protocol ' + arduinoContext?.port?.protocol);
		log('arduinoContext?.port?.protocolLabel ' + arduinoContext?.port?.protocolLabel);
		log('arduinoContext?.sketchPath ' + arduinoContext?.sketchPath);
		log('arduinoContext?.userDirPath ' + arduinoContext?.userDirPath);
		*/

		if (arduinoContext?.boardDetails) {
			let esptool = String(arduinoContext?.boardDetails.buildProperties['tools.esptool_py.path'] + '/' + arduinoContext?.boardDetails?.buildProperties['tools.esptool_py.cmd']);
			log(esptool);
			let opts = ['--port', arduinoContext?.port?.address, 'erase_flash'];
			log(JSON.stringify(opts));
			let exitCode = await runCommand(esptool, opts);
			if (exitCode) {
				// Error
				vscode.window.showInformationMessage('Failed to connect to Espressif device');
			} else {
				vscode.window.showInformationMessage('Chip erase completed successfully');
			}
		} else {
			log('Please reselect the port');
			vscode.window.showInformationMessage('Please reselect the port');
		}
	}));

	const button = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Right,
		200
	);
	button.command = 'arduino-esp32-erase.erase';
	button.text = '$(trash) ESP32 Erase';
	context.subscriptions.push(button);
	button.show();
}

export function deactivate() { }
