'use strict';
import * as vscode from 'vscode';
import {AuditResult} from './interface';

export class UI {
  static async updateStatusBar(
      statusBar: vscode.StatusBarItem, auditResult: AuditResult) {
    if (auditResult.critical) {
      statusBar.text = '$(alert) Critical';
      statusBar.color = 'darkred';
    } else if (auditResult.high) {
      statusBar.text = '$(alert) High';
      statusBar.color = 'red';
    } else if (auditResult.moderate) {
      statusBar.text = 'Moderate';
      statusBar.color = undefined;
    } else {
      statusBar.text = 'Low';
      statusBar.color = undefined;
    }

    const vulnerabilities = [];
    if (auditResult.low) {
      vulnerabilities.push(`${auditResult.low} low`);
    }
    if (auditResult.moderate) {
      vulnerabilities.push(`${auditResult.moderate} moderate`);
    }
    if (auditResult.high) {
      vulnerabilities.push(`${auditResult.high} high`);
    }
    if (auditResult.critical) {
      vulnerabilities.push(`${auditResult.critical} critical`);
    }

    let tooltip = '';
    if (vulnerabilities.length === 1) {
      tooltip = vulnerabilities[0] +
          (auditResult.low + auditResult.moderate + auditResult.high > 1 ?
               ' vulnerabilities.' :
               ' vulnerability.');
    } else if (vulnerabilities.length === 2) {
      tooltip = vulnerabilities[0] + ' and ' + vulnerabilities[1] +
          ' vulnerabilities.';
    } else if (vulnerabilities.length === 3) {
      tooltip = vulnerabilities[0] + ', ' + vulnerabilities[1] + ' and ' +
          vulnerabilities[2] + ' vulnerabilities.';
    } else {
      tooltip = vulnerabilities[0] + ', ' + vulnerabilities[1] + ', ' +
          vulnerabilities[2] + ' and ' + vulnerabilities[3] +
          ' vulnerabilities.';
    }

    if (auditResult.noPatch) {
      tooltip += ` ${auditResult.noPatch} vulnerable ${
          auditResult.noPatch > 1 ? 'dependencies have' :
                                    'dependency has'} no available patch.`;
    }
    statusBar.tooltip = tooltip;

    statusBar.command = 'cve.fix';
    statusBar.show();
  }
}