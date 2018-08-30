'use strict';
import * as cp from 'child_process';

export class Audit {
  static async check(npmPath: string, path: string) {
    return new Promise(
        (resolve: (value: null|{low: number, moderate: number, high: number}) =>
             void) => {
          let log = '';
          const audit =
              cp.spawn('node', [npmPath, 'audit'], {cwd: path, shell: true});

          audit.stdout.on('data', chunk => {
            log += chunk;
          });

          audit.stdout.on('end', () => {
            const vulnerabilities =
                log.match(/found (.*?) in \d+ scanned packages/);
            if (!vulnerabilities) {
              return resolve(null);
            } else {
              const lowMatch = vulnerabilities[1].match(/(\d+) low/);
              const moderateMatch = vulnerabilities[1].match(/(\d+) moderate/);
              const highMatch = vulnerabilities[1].match(/(\d+) high/);
              const low = lowMatch ? Number(lowMatch[1]) : 0;
              const moderate = moderateMatch ? Number(moderateMatch[1]) : 0;
              const high = highMatch ? Number(highMatch[1]) : 0;

              return resolve({low, moderate, high});
            }
          });
        });
  }

  static async fix(npmPath: string, path: string) {
    return new Promise(resolve => {
      const audit =
          cp.spawn('node', [npmPath, 'audit', 'fix'], {cwd: path, shell: true});

      audit.stdout.on('end', () => {
        return resolve();
      });
    });
  }
}