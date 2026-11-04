// R3 token values for scripts (QA1: springs, durations and swells are read from tokens/hsb-tokens.css, never typed in
// code). Read at the moment of use: the reduced-motion block of hsb-tokens.css changes some of them (durations to 0,
// swells to 0), and the page's theme may change.
const style = () => getComputedStyle(document.documentElement);

// The raw value of --hsb-<name>, trimmed.
export const tok = (name) => style().getPropertyValue(`--hsb-${name}`).trim();

// A number: "0.36", "64px", "8px" -> 0.36, 64, 8.
export const tokNum = (name) => parseFloat(tok(name));

// A duration in milliseconds: "280ms" -> 280, "1.2s" -> 1200.
export const tokMs = (name) => {
  const value = tok(name);
  return value.endsWith('ms') ? parseFloat(value) : parseFloat(value) * 1000;
};

// A spring: the --hsb-spring-<name>-omega / -zeta pair as { w, z }.
export const tokSpring = (name) => ({ w: tokNum(`spring-${name}-omega`), z: tokNum(`spring-${name}-zeta`) });
