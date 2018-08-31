'use strict';
import * as vscode from 'vscode';
import * as cp from 'child_process';

const MAX_FIX_ATTEMPT_COUNT = 5;
let fixAttemptCount = 0;

export class Audit {
  static async check(npmPath: string, path: string) {
    return new Promise(
        (resolve: (
             value: null|
             {low: number, moderate: number, high: number, critical: number}) =>
             void) => {
          let log = '';
          const audit =
              cp.spawn('node', [npmPath, 'audit'], {cwd: path, shell: true});
          // console.log(['node', npmPath, 'audit'], path);

          audit.stdout.on('data', chunk => {
            log += chunk;
          });

          audit.stdout.on('end', () => {
            // console.log(log);
            const vulnerabilities =
                log.match(/found (.*?) in \d+ scanned packages/);
            if (!vulnerabilities) {
              return resolve(null);
            } else {
              const lowMatch = vulnerabilities[1].match(/(\d+) low/);
              const moderateMatch = vulnerabilities[1].match(/(\d+) moderate/);
              const highMatch = vulnerabilities[1].match(/(\d+) high/);
              const criticalMatch = vulnerabilities[1].match(/(\d+) critical/);
              const low = lowMatch ? Number(lowMatch[1]) : 0;
              const moderate = moderateMatch ? Number(moderateMatch[1]) : 0;
              const high = highMatch ? Number(highMatch[1]) : 0;
              const critical = criticalMatch ? Number(criticalMatch[1]) : 0;

              return resolve({low, moderate, high, critical});
            }
          });
        });
  }

  static async fix(
      statusBar: vscode.StatusBarItem, npmPath: string, path: string,
      force = false) {
    return new Promise(resolve => {
      let log = '';
      const args = [npmPath, 'audit', 'fix'];
      if (force) {
        args.push('--force');
      }
      const audit = cp.spawn('node', args, {cwd: path, shell: true});

      audit.stdout.on('data', chunk => {
        log += chunk;
      });

      audit.stdout.on('end', async () => {
        fixAttemptCount++;
        if (fixAttemptCount >= MAX_FIX_ATTEMPT_COUNT) {
          fixAttemptCount = 0;
          await Audit.updateStatusBar(statusBar, npmPath, path);
          vscode.window.showWarningMessage(
              'Some vulnerabilities are fixed failed.');
        } else {
          if (log.indexOf('breaking changes') === -1) {
            await Audit.updateStatusBar(statusBar, npmPath, path);
            vscode.window.showInformationMessage('Fixed all vulnerabilities.');
          } else if (force === true) {
            await Audit.fix(statusBar, npmPath, path, true);
          } else {
            const choice = await vscode.window.showWarningMessage(
                'There\'re breaking changes for fix all vulnerabilities. Would you like to install breaking changes?',
                'Yes', 'No');
            if (choice === 'Yes') {
              await Audit.fix(statusBar, npmPath, path, true);
            } else {
              await Audit.updateStatusBar(statusBar, npmPath, path);
              vscode.window.showWarningMessage(
                  'Some vulnerabilities are not fixed.');
            }
          }
        }

        return resolve();
      });
    });
  }

  static async updateStatusBar(
      statusBar: vscode.StatusBarItem, npmPath: string, rootPath: string) {
    console.log('Updating CVE status bar...');

    const vulnerabilities = await Audit.check(npmPath, rootPath);
    console.log('Vulnerabilities:', vulnerabilities);

    if (!vulnerabilities) {
      statusBar.hide();
      return;
    }

    if (vulnerabilities.critical) {
      statusBar.text = '$(alert) Critical';
      statusBar.color = 'darkred';
    } else if (vulnerabilities.high) {
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
    if (vulnerabilities.critical) {
      tooltip.push(`${vulnerabilities.critical} critical`);
    }

    if (tooltip.length === 1) {
      statusBar.tooltip = tooltip[0] +
          (vulnerabilities.low + vulnerabilities.moderate +
                       vulnerabilities.high >
                   1 ?
               ' vulnerabilities' :
               ' vulnerability');
    } else if (tooltip.length === 2) {
      statusBar.tooltip =
          tooltip[0] + ' and ' + tooltip[1] + ' vulnerabilities';
    } else if (tooltip.length === 3) {
      statusBar.tooltip = tooltip[0] + ', ' + tooltip[1] + ' and ' +
          tooltip[2] + ' vulnerabilities';
    } else {
      statusBar.tooltip = tooltip[0] + ', ' + tooltip[1] + ', ' + tooltip[2] +
          ' and ' + tooltip[3] + ' vulnerabilities';
    }

    statusBar.command = 'cve.fix';
    statusBar.show();
  }
}