'use strict';
import * as vscode from 'vscode';
import {Audit} from './audit';
import {UI} from './ui';

let fixing = false;

async function updateStatusBar(
    statusBar: vscode.StatusBarItem, npmPath: string, rootPath: string) {
  const auditResult = await Audit.check(npmPath, rootPath);
  await UI.updateStatusBar(statusBar, auditResult);
}

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
            async () => {
              const fixResult = await Audit.fix(npmPath, rootPath);
              await updateStatusBar(statusBar, npmPath, rootPath);

              if (fixResult.code === 0) {
                vscode.window.showInformationMessage(fixResult.message);
              } else {
                vscode.window.showWarningMessage(fixResult.message);
              }

              fixing = false;
              return Promise.resolve();
            });
      }));

  updateStatusBar(statusBar, npmPath, rootPath);
}

export function deactivate() {}