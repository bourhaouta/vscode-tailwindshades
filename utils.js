const Values = require('values.js')
const { formatCss, converter, parse } = require('culori')

const hexToOklch = converter('oklch')

/**
 * Format OKLCH color ensuring no 'none' values
 * @param {string} hexColor 
 */
function formatOklch(hexColor) {
  const oklchColor = hexToOklch(hexColor)
  // Ensure hue is always a number (default to 0 for achromatic colors)
  oklchColor.h = oklchColor.h ?? 0
  // Format with fixed precision
  return `oklch(${oklchColor.l.toFixed(3)} ${oklchColor.c.toFixed(3)} ${oklchColor.h.toFixed(1)})`;
}

/**
 * @param {number} steps
 * @param {string} color
 */
function generatePalette(steps, color) {
  const generator = new Values()
  if (!generator.setColor(color)) {
    return null
  }

  const palette = generator
    .all(steps)
    .filter(({ weight }) => weight !== 100)
    .reduce(
      (ac, c, index) => ({
        ...ac,
        [(index + 1) * 100]: formatOklch(c.hexString()),
      }),
      {},
    )

  return palette
}

/**
 * @param {string} colorName
 * @param {object} palette
 * @param {number} tabSize
 */
function getPaletteString(colorName, palette, tabSize) {
  return `${colorName}: ${JSON.stringify(palette, null, tabSize).replace(
    /"([^"]+)":/g,
    '$1:',
  )},`
}

/**
 * @param {string} colorName
 * @param {object} palette
 * @param {number} tabSize
 */
function getPaletteStringCSSVars(colorName, palette, tabSize) {
  const paletteString = Object.entries(palette)
    .map(([key, value], index) => {
      return `${index === 0 ? '' : ' '.repeat(tabSize)
        }--color-${colorName}-${key}: ${value};`
    })
    .join('\n')

  return paletteString
}

/**
 * @param {*} editor TextEditor
 */
function getSelection(editor) {
  const selectionAcitve = editor.selection.active
  const selectionAnchor = editor.selection.anchor
  const selection = editor.selection.isReversed
    ? selectionAcitve
    : selectionAnchor

  return selection
}

module.exports = {
  getSelection,
  generatePalette,
  getPaletteString,
  getPaletteStringCSSVars,
}
