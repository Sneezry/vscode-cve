'use strict';
import * as vscode from 'vscode';
import {Audit} from './audit';

let fixing = false;

async function updateStatusBar(
    statusBar: vscode.StatusBarItem, npmPath: string, rootPath: string) {
  console.log('Updating CVE status bar...');

  const vulnerabilities = await Audit.check(npmPath, rootPath);
  console.log('Vulnerabilities:', vulnerabilities);

  if (!vulnerabilities) {
    statusBar.hide();
    return;
  }

  if (vulnerabilities.high) {
    statusBar.text = '$(alert) High';
    statusBar.color = 'red';
  } else if (vulnerabilities.moderate) {
    statusBar.text = 'Moderate';
    statusBar.color = undefined;
  } else {
    statusBar.text = 'Low';
    statusBar.color = undefined;
  }

  const tooltip = [];
  if (vulnerabilities.low) {
    tooltip.push(`${vulnerabilities.low} low`);
  }
  if (vulnerabilities.moderate) {
    tooltip.push(`${vulnerabilities.moderate} moderate`);
  }
  if (vulnerabilities.high) {
    tooltip.push(`${vulnerabilities.high} high`);
  }

  if (tooltip.length === 1) {
    statusBar.tooltip = tooltip[0] +
        (vulnerabilities.low + vulnerabilities.moderate + vulnerabilities.high >
                 1 ?
             ' vulnerabilities' :
             ' vulnerability');
  } else if (tooltip.length === 2) {
    statusBar.tooltip = tooltip[0] + ' and ' + tooltip[1] + ' vulnerabilities';
  } else {
    statusBar.tooltip = tooltip[0] + ', ' + tooltip[1] + ' and ' + tooltip[2] +
        ' vulnerabilities';
  }

  statusBar.command = 'cve.fix';
  statusBar.show();
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
              title: 'Fixing vulnerabilities',
              cancellable: false
            },
            () => {
              return Audit.fix(npmPath, rootPath).then(() => {
                updateStatusBar(statusBar, npmPath, rootPath);
              }).then(() => {
                fixing = false;
              });
            });
      }));

  updateStatusBar(statusBar, npmPath, rootPath);
}

export function deactivate() {}