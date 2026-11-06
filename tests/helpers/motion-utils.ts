export interface MotionAuditResult {
  hasDurationViolation: boolean;
  violatingDurations: string[];
  hasCompositorViolation: boolean;
  violatingTransitions: string[];
  hasReducedMotionSupport: boolean;
  hasLegacySmilAnimation: boolean;
}

export function auditHtmlMotion(html: string): MotionAuditResult {
  const violatingDurations: string[] = [];
  const violatingTransitions: string[] = [];

  // Check for duration violations (> 200ms)
  const durationMatches = html.match(/duration-(300|500|700|1000)/g) || [];
  for (const d of durationMatches) {
    if (!violatingDurations.includes(d)) {
      violatingDurations.push(d);
    }
  }

  // Check for non-composited layout transitions (transition-all or width/height transitions)
  const transitionMatches = html.match(/transition-(all|height|width)/g) || [];
  for (const t of transitionMatches) {
    if (!violatingTransitions.includes(t)) {
      violatingTransitions.push(t);
    }
  }

  // Check for reduced motion variant classes
  const hasReducedMotionSupport = /motion-reduce:(transition-none|transform-none|opacity-100|hidden)/.test(html);

  // Check for SMIL animations in SVG
  const hasLegacySmilAnimation = /<animate[\s\/>]/.test(html);

  return {
    hasDurationViolation: violatingDurations.length > 0,
    violatingDurations,
    hasCompositorViolation: violatingTransitions.length > 0,
    violatingTransitions,
    hasReducedMotionSupport,
    hasLegacySmilAnimation,
  };
}

export function auditCssMotion(cssContent: string): {
  durationsOver200ms: string[];
  hasReducedMotionMedia: boolean;
  usesCompositorSafeTransforms: boolean;
} {
  const durationsOver200ms: string[] = [];
  const durationRegex = /(\d+(\.\d+)?)m?s/g;
  let match;
  while ((match = durationRegex.exec(cssContent)) !== null) {
    const raw = match[0];
    let ms = 0;
    if (raw.endsWith('ms')) {
      ms = parseFloat(raw.replace('ms', ''));
    } else if (raw.endsWith('s')) {
      ms = parseFloat(raw.replace('s', '')) * 1000;
    }
    if (ms > 200 && ms < 10000) {
      if (!durationsOver200ms.includes(raw)) {
        durationsOver200ms.push(raw);
      }
    }
  }

  const hasReducedMotionMedia = /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/i.test(cssContent);
  const usesCompositorSafeTransforms = /transform|opacity|scaleX|translate/.test(cssContent);

  return {
    durationsOver200ms,
    hasReducedMotionMedia,
    usesCompositorSafeTransforms,
  };
}
