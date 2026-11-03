type RGB = [number, number, number];

const WHITE: RGB = [255, 255, 255];
const BLACK: RGB = [0, 0, 0];
const NEUTRAL = "#171717";

function hexToRgb(hex: string): RGB | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Luminance relative et contraste selon la formule WCAG 2
function luminance([r, g, b]: RGB) {
  const [lr, lg, lb] = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

export function contrast(a: RGB, b: RGB) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export type Theme = { accent: string; buttonBg: string; buttonFg: string };

export function buildTheme(primary: string): Theme {
  const rgb = hexToRgb(primary);
  // Couleur absente ou invalide : thème neutre
  if (!rgb) return { accent: NEUTRAL, buttonBg: NEUTRAL, buttonFg: "#ffffff" };

  const onWhite = contrast(rgb, WHITE);
  const onBlack = contrast(rgb, BLACK);
  const textContrast = Math.max(onWhite, onBlack);

  return {
    // Bordures et focus : au moins 3:1 contre le fond blanc (WCAG 1.4.11)
    accent: onWhite >= 3 ? primary : NEUTRAL,
    // Bouton : texte au moins à 4,5:1 (WCAG 1.4.3), en blanc ou en noir selon le meilleur
    buttonBg: textContrast >= 4.5 ? primary : NEUTRAL,
    buttonFg: textContrast >= 4.5 && onBlack > onWhite ? "#000000" : "#ffffff",
  };
}