import * as vscode from 'vscode'
import { formatPalette, isInsideThemeBlock, isValidName, outputForLanguage } from './format'
import { generatePalette, parseColor, type ColorFormat } from './palette'
import {
  LATEST_VERSION,
  VERSIONS,
  versionFromPackageJson,
  type Output,
  type TailwindVersion,
} from './versions'

// A CSS color under the cursor: hex or a color function like rgb(), hsl(), oklch()
const COLOR_AT_CURSOR =
  /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\([^)]*\)/i

const OUTPUT_LABELS: Record<Output, string> = {
  theme: 'Tailwind v4 @theme (CSS)',
  config: 'tailwind.config.js object',
  cssVariables: 'CSS variables',
}

type Settings = {
  tailwindVersion: 'auto' | `${TailwindVersion}`
  colorFormat: 'auto' | ColorFormat
  output: 'auto' | Output
  promptForName: boolean
}

function getSettings(scope: vscode.Uri): Settings {
  const config = vscode.workspace.getConfiguration('tailwindshades', scope)
  return {
    tailwindVersion: config.get('tailwindVersion', 'auto'),
    colorFormat: config.get('colorFormat', 'auto'),
    output: config.get('output', 'auto'),
    promptForName: config.get('promptForName', true),
  }
}

/** Finds the closest package.json above the document and reads its Tailwind version */
async function detectVersion(document: vscode.TextDocument): Promise<TailwindVersion | undefined> {
  const folder =
    vscode.workspace.getWorkspaceFolder(document.uri) ?? vscode.workspace.workspaceFolders?.[0]
  if (!folder) return undefined

  let dir =
    document.uri.scheme === 'file' ? vscode.Uri.joinPath(document.uri, '..') : folder.uri

  while (dir.path.startsWith(folder.uri.path)) {
    try {
      const bytes = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(dir, 'package.json'))
      const version = versionFromPackageJson(new TextDecoder().decode(bytes))
      if (version) return version
    } catch {
      // No package.json here: keep looking in the parent folder
    }
    if (dir.path === folder.uri.path) break
    dir = vscode.Uri.joinPath(dir, '..')
  }

  return undefined
}

/** The selection, or the color under the cursor, or a color the user types */
async function getColorInput(
  editor: vscode.TextEditor,
): Promise<{ text: string; range: vscode.Range } | undefined> {
  const { document, selection } = editor

  if (!selection.isEmpty) {
    return { text: document.getText(selection), range: selection }
  }

  const range = document.getWordRangeAtPosition(selection.active, COLOR_AT_CURSOR)
  if (range) return { text: document.getText(range), range }

  const text = await vscode.window.showInputBox({
    title: 'Tailwind Shades',
    prompt: 'Enter a color (hex, rgb(), hsl(), oklch(), or a CSS color name)',
    placeHolder: '#3b82f6',
    validateInput: (value) => (parseColor(value) ? undefined : 'This is not a valid CSS color'),
  })
  return text ? { text, range: selection } : undefined
}

async function pickVersion(detected: TailwindVersion | undefined) {
  const items = ([4, 3, 2, 1] as const).map((version) => ({
    label: `Tailwind CSS v${version}`,
    description: version === detected ? 'detected in package.json' : undefined,
    version,
  }))
  const picked = await vscode.window.showQuickPick(items, {
    title: 'Tailwind Shades: Tailwind CSS version',
  })
  return picked?.version
}

async function pickOutput(profileOutput: Output) {
  const items = (Object.keys(OUTPUT_LABELS) as Output[]).map((output) => ({
    label: OUTPUT_LABELS[output],
    description: output === profileOutput ? 'default for this version' : undefined,
    output,
  }))
  const picked = await vscode.window.showQuickPick(items, { title: 'Tailwind Shades: Output' })
  return picked?.output
}

type RunOptions = {
  /** Always write this output */
  output?: Output
  /** Ask for the Tailwind version and the output */
  choose?: boolean
}

async function generate({ output: forcedOutput, choose = false }: RunOptions = {}) {
  const editor = vscode.window.activeTextEditor
  if (!editor) {
    vscode.window.showErrorMessage('Tailwind Shades: open a file first.')
    return
  }

  const { document } = editor
  const settings = getSettings(document.uri)

  const input = await getColorInput(editor)
  if (!input) return

  const color = parseColor(input.text)
  if (!color) {
    vscode.window.showErrorMessage(`Tailwind Shades: "${input.text}" is not a valid CSS color.`)
    return
  }

  // Tailwind version: setting > package.json > latest
  const detected = await detectVersion(document)
  let version: TailwindVersion =
    settings.tailwindVersion === 'auto'
      ? (detected ?? LATEST_VERSION)
      : (Number(settings.tailwindVersion) as TailwindVersion)

  if (choose) {
    const picked = await pickVersion(detected)
    if (!picked) return
    version = picked
  }
  const profile = VERSIONS[version]

  // Output: command > setting > file type. Ask when choosing, or when the file type is unknown.
  let output: Output | undefined = forcedOutput
  if (!output && !choose) {
    output =
      settings.output === 'auto'
        ? outputForLanguage(document.languageId, profile)
        : settings.output
  }
  if (!output) output = await pickOutput(profile.cssOutput)
  if (!output) return

  const palette = generatePalette(color, profile.reference)

  let name = palette.family
  if (settings.promptForName) {
    const typed = await vscode.window.showInputBox({
      title: 'Tailwind Shades: color name',
      prompt: `Closest Tailwind color: ${palette.family}. Use a custom name like "brand" to avoid replacing it.`,
      value: palette.family,
      valueSelection: [0, palette.family.length],
      validateInput: (value) =>
        isValidName(value) ? undefined : 'Use letters, digits and dashes, starting with a letter',
    })
    if (typed === undefined) return
    name = typed
  }

  const { insertSpaces, tabSize } = editor.options
  const indent = insertSpaces === false ? '\t' : ' '.repeat(Number(tabSize) || 2)
  const line = document.lineAt(input.range.start.line)
  const baseIndent = line.text.slice(0, line.firstNonWhitespaceCharacterIndex)
  const textBefore = document.getText(new vscode.Range(new vscode.Position(0, 0), input.range.start))

  const text = formatPalette({
    name,
    palette,
    output,
    colorFormat: settings.colorFormat === 'auto' ? profile.colorFormat : settings.colorFormat,
    indent,
    baseIndent,
    insideTheme: output === 'theme' && isInsideThemeBlock(textBefore),
  })

  const applied = await editor.edit((builder) => builder.replace(input.range, text))
  if (!applied) return

  const first = palette.shades[0].shade
  const last = palette.shades[palette.shades.length - 1].shade
  vscode.window.setStatusBarMessage(
    `Tailwind Shades: ${name}-${first} to ${name}-${last} (v${version}), your color is ${name}-${palette.anchor}`,
    6000,
  )
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('tailwindshades.generateColorPalette', () => generate()),
    vscode.commands.registerCommand('tailwindshades.generateColorPaletteAs', () =>
      generate({ choose: true }),
    ),
    vscode.commands.registerCommand('tailwindshades.generateColorPaletteCSSVars', () =>
      generate({ output: 'cssVariables' }),
    ),
  )
}

export function deactivate() {}
