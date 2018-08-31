'use strict';
import * as vscode from 'vscode';
import * as cp from 'child_process';
import {AuditResult, AuditFixResult} from './interface';

const MAX_FIX_ATTEMPT_COUNT = 5;
let fixAttemptCount = 0;

export class Audit {
  static async check(npmPath: string, path: string) {
    return new Promise((resolve: (value: null|AuditResult) => void) => {
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

          const noPatchMatch = log.match(/No patch available/g);
          const noPatch = noPatchMatch ? noPatchMatch.length : 0;

          return resolve({low, moderate, high, critical, noPatch});
        }
      });
    });
  }

  static async fix(npmPath: string, path: string, force = false) {
    return new Promise((resolve: (value: AuditFixResult) => void) => {
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
        let fixResult: AuditFixResult;
        fixAttemptCount++;
        if (fixAttemptCount >= MAX_FIX_ATTEMPT_COUNT) {
          fixAttemptCount = 0;
          fixResult = {
            code: 1,
            message:
                'Some vulnerabilities are not fixed. Attempt limit reached.'
          };
        } else {
          if (log.indexOf('breaking changes') !== -1) {
            if (force === true) {
              fixResult = await Audit.fix(npmPath, path, true);
            } else {
              const choice = await vscode.window.showWarningMessage(
                  'There\'re breaking changes for fix all vulnerabilities. Would you like to install breaking changes?',
                  'Yes', 'No');
              if (choice === 'Yes') {
                fixResult = await Audit.fix(npmPath, path, true);
              } else {
                fixResult = {
                  code: 1,
                  message: 'Some vulnerabilities are not fixed.'
                };
              }
            }
          } else if (
              log.indexOf('required manual review and could not be updated') !==
              -1) {
            fixResult = {
              code: 1,
              message:
                  'Some vulnerabilities are not fixed and required manual review.'
            };
          } else {
            fixResult = {code: 0, message: 'Fixed all vulnerabilities.'};
          }
        }

        return resolve(fixResult);
      });
    });
  }
}