'use strict';
import * as vscode from 'vscode';
import {Audit} from './audit';

let fixing = false;

export function activate(context: vscode.ExtensionContext) {
  console.log('Activating CVE...');
  const npmPath = context.asAbsolutePath('node_modules/npm/lib/npm');
  const rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
  const statusBar =
      vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);

  context.subscriptions.push(
      vscode.commands.registerCommand('cve.fix', async () => {
        if (fixing) {
          return;
        }
        fixing = true;

        vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: 'Fixing vulnerabilities...',
              cancellable: false
            },
            () => {
              return Audit.fix(statusBar, npmPath, rootPath).then(() => {
                fixing = false;
              });
            });
      }));

  Audit.updateStatusBar(statusBar, npmPath, rootPath);
}

export function deactivate() {}