import * as vscode from 'vscode';
import { execFile } from 'node:child_process';
import { resolve } from 'node:path';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('inspectorepo.runAnalysis', async () => {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      vscode.window.showWarningMessage('Open a workspace folder to run InspectoRepo analysis.');
      return;
    }

    const workspaceRoot = folders[0].uri.fsPath;
    const reportName = 'inspectorepo-vscode-report.md';
    const reportPath = resolve(workspaceRoot, reportName);

    // Resolve the CLI entry point relative to this extension's location
    const cliPath = resolve(__dirname, '..', '..', 'cli', 'dist', 'index.js');

    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'InspectoRepo: Running analysis…',
        cancellable: false,
      },
      () =>
        new Promise<void>((resolvePromise) => {
          execFile(
            process.execPath,
            [cliPath, 'analyze', workspaceRoot, '--format', 'md', '--out', reportPath],
            { cwd: workspaceRoot, timeout: 120_000 },
            (error) => {
              if (error) {
                vscode.window.showErrorMessage(`InspectoRepo analysis failed: ${error.message}`);
              } else {
                vscode.window.showInformationMessage(
                  `InspectoRepo analysis complete. Report saved to ${reportName}`
                );
              }
              resolvePromise();
            }
          );
        })
    );
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
