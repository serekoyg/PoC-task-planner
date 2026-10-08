export const clampRgb = (value: number) => Math.max(0, Math.min(255, value || 0))
export const toHexPart = (value: number) => clampRgb(value).toString(16).padStart(2, '0')
export const rgbToHex = (red: number, green: number, blue: number) =>
  `#${toHexPart(red)}${toHexPart(green)}${toHexPart(blue)}`
export const hexToRgb = (color: string) => {
  const normalized = color.replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return [37, 99, 235] as const
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ] as const
}

export const rgbToHsv = (red: number, green: number, blue: number) => {
  const normalized = [red / 255, green / 255, blue / 255]
  const max = Math.max(...normalized)
  const min = Math.min(...normalized)
  const delta = max - min
  let hue = 0

  if (delta > 0) {
    if (max === normalized[0]) {
      hue = 60 * (((normalized[1] - normalized[2]) / delta) % 6)
    } else if (max === normalized[1]) {
      hue = 60 * ((normalized[2] - normalized[0]) / delta + 2)
    } else {
      hue = 60 * ((normalized[0] - normalized[1]) / delta + 4)
    }
  }

  return {
    hue: hue < 0 ? hue + 360 : hue,
    saturation: max === 0 ? 0 : (delta / max) * 100,
    value: max * 100,
  }
}

export const hsvToHex = (hue: number, saturation: number, value: number) => {
  const chroma = (value / 100) * (saturation / 100)
  const hueSection = hue / 60
  const secondary = chroma * (1 - Math.abs((hueSection % 2) - 1))
  const offset = value / 100 - chroma
  const [red, green, blue] =
    hueSection < 1
      ? [chroma, secondary, 0]
      : hueSection < 2
        ? [secondary, chroma, 0]
        : hueSection < 3
          ? [0, chroma, secondary]
          : hueSection < 4
            ? [0, secondary, chroma]
            : hueSection < 5
              ? [secondary, 0, chroma]
              : [chroma, 0, secondary]

  return rgbToHex(
    Math.round((red + offset) * 255),
    Math.round((green + offset) * 255),
    Math.round((blue + offset) * 255),
  )
}
