const vscode = require("vscode");
const Values = require("values.js");
const namer = require("hex-to-color-name");

const COLOR_MAP = {
  black: "000000",
  white: "FFFFFF",
  gray: "A0AEC0",
  red: "F56565",
  orange: "ED8936",
  yellow: "ECC94B",
  green: "48BB78",
  teal: "38B2AC",
  blue: "4299E1",
  indigo: "667EEA",
  purple: "9F7AEA",
  pink: "ED64A6",
};

/**
 * @param {vscode.ExtensionContext} context
 */
const activate = (context) => {
  let disposable = vscode.commands.registerCommand(
    "tailwindshades.generateColorPalette",
    () => {
      const editor = vscode.window.activeTextEditor;
      const selectedText = editor.document.getText(editor.selection);
      const generator = new Values();

      /**
       * @param {number} steps
       */
      const generatePalette = (steps) =>
        generator
          .all(steps)
          .filter(({ weight }) => weight !== 100)
          .reduce(
            (ac, c, index) => ({
              ...ac,
              [(index + 1) * 100]: c.hexString(),
            }),
            {}
          );

      /**
       * @param {string} colorName
       * @param {object} palette
       * @param {number} tabSize
       */
      const generatePaletteString = (colorName, palette, tabSize) =>
        `${colorName}: ${JSON.stringify(palette, null, tabSize).replace(
          /"([^"]+)":/g,
          "$1:"
        )},`;

      if (editor && generator.setColor(selectedText)) {
        const colorName = namer(selectedText, COLOR_MAP);

        const palette = generatePalette(20);

        editor.edit((builder) => {
          const workbenchConfig = vscode.workspace.getConfiguration("editor");
          const tabSize = workbenchConfig.get("tabSize");
          const selection = editor.selection.active;
          const paletteString = generatePaletteString(
            colorName,
            palette,
            selection.character + tabSize
          );

          builder.replace(editor.selection, paletteString);

          editor.selection = new vscode.Selection(
            selection.with(selection.line, selection.character),
            selection.with(
              selection.line,
              selection.character + colorName.length
            )
          );
        });
      } else {
        vscode.window.showErrorMessage("Please select a valid color!");
      }
    }
  );

  context.subscriptions.push(disposable);
};
exports.activate = activate;

const deactivate = () => {};

module.exports = {
  activate,
  deactivate,
};
