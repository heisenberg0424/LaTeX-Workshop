import * as vscode from 'vscode'
import * as path from 'path'
import rimraf from 'rimraf'

import { Extension } from '../../src/main'
import { sleep, assertAutoBuild, assertBuild, getExtension, runTest, writeTeX } from './utils'

suite('Auto-build test suite', () => {

    let extension: Extension
    const suiteName = path.basename(__filename).replace('.test.js', '')
    let fixture = path.resolve(__dirname, '../../../test/fixtures/testground')
    const fixtureName = 'testground'

    suiteSetup(async () => {
        extension = await getExtension()
        fixture = path.resolve(extension.extensionRoot, 'test/fixtures/testground')
    })

    setup(async () => {
        await vscode.commands.executeCommand('latex-workshop.activate')
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.interval', 250)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.run', 'onFileChange')
    })

    teardown(async () => {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors')
        extension.manager.rootFile = undefined

        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.run', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.interval', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.outDir', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.useSubFile', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.search.rootFiles.include', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.watch.files.ignore', undefined)

        if (path.basename(fixture) === 'testground') {
            rimraf(fixture + '/{*,.vscode/*}', (e) => {if (e) {console.error(e)}})
            await sleep(500) // Required for pooling
        }
    })

    runTest({suiteName, fixtureName, testName: 'auto build'}, async () => {
        await writeTeX('main', fixture)
        await assertAutoBuild({fixture, texName: 'main.tex', pdfName: 'main.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'auto build with subfiles and onFileChange 1'}, async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.useSubFile', false)
        await writeTeX('subfile', fixture)
        await assertAutoBuild({fixture, texName: 'sub/s.tex', pdfName: 'main.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'auto build with subfiles and onFileChange 2'}, async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.useSubFile', true)
        await writeTeX('subfile', fixture)
        await assertAutoBuild({fixture, texName: 'sub/s.tex', pdfName: 'sub/s.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'auto build with import and onFileChange'}, async () => {
        await writeTeX('importthreelayer', fixture)
        await assertAutoBuild({fixture, texName: 'sub/subsub/sss/sss.tex', pdfName: 'main.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'auto build with input and onFileChange'}, async () => {
        await writeTeX('input', fixture)
        await assertAutoBuild({fixture, texName: 'sub/s.tex', pdfName: 'main.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'auto build when editing bib'}, async () => {
        await writeTeX('bibtex', fixture)
        await assertBuild({fixture, texName: 'main.tex', pdfName: 'main.pdf', extension})
        await assertAutoBuild({fixture, texName: 'bib.bib', pdfName: 'main.pdf', extension}, ['skipFirstBuild'])
    })

    runTest({suiteName, fixtureName, testName: 'auto build with input whose path uses a macro'}, async () => {
        await writeTeX('inputmacro', fixture)
        await assertBuild({fixture, texName: 'main.tex', pdfName: 'main.pdf', extension})
        await assertAutoBuild({fixture, texName: 'sub/s.tex', pdfName: 'main.pdf', extension}, ['skipFirstBuild'])
    })

    runTest({suiteName, fixtureName, testName: 'auto build when main.tex not in root dir and editing a sub file'}, async () => {
        await writeTeX('inputfromfolder', fixture)
        await assertBuild({fixture, texName: 'main/main.tex', pdfName: 'main/main.pdf', extension})
        await assertAutoBuild({fixture, texName: 'sub/s.tex', pdfName: 'main/main.pdf', extension}, ['skipFirstBuild'])
    })

    runTest({suiteName, fixtureName, testName: 'auto build with input and outDir'}, async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.outDir', './out')
        await writeTeX('input', fixture)
        await assertAutoBuild({fixture, texName: 'sub/s.tex', pdfName: 'out/main.pdf', extension})
    })

    runTest({suiteName, fixtureName, testName: 'auto build with watch.files.ignore'}, async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.watch.files.ignore', ['**/s.tex'])
        await writeTeX('input', fixture)
        await assertBuild({fixture, texName: 'main.tex', pdfName: 'main.pdf', extension})
        await assertAutoBuild({fixture, texName: 'sub/s.tex', pdfName: 'main.pdf', extension}, ['skipFirstBuild', 'noAutoBuild'])
    })

    runTest({suiteName, fixtureName, testName: 'auto build with subfiles and onSave 1'}, async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.run', 'onSave')
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.useSubFile', false)
        await writeTeX('subfile', fixture)
        await assertAutoBuild({fixture, texName: 'sub/s.tex', pdfName: 'main.pdf', extension}, ['onSave'])
    })

    runTest({suiteName, fixtureName, testName: 'auto build with subfiles and onSave 2'}, async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.run', 'onSave')
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.doNotPrompt', true)
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.rootFile.useSubFile', true)
        await writeTeX('subfile', fixture)
        await assertAutoBuild({fixture, texName: 'sub/s.tex', pdfName: 'sub/s.pdf', extension}, ['onSave'])
    })
})
