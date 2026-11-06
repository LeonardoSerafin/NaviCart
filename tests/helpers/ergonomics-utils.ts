export interface TouchTargetAssessment {
  tag: string;
  className: string;
  textSnippet: string;
  isCompliant: boolean;
  estimatedWidth: number;
  estimatedHeight: number;
  reason?: string;
}

export function estimateDimensionFromClasses(classList: string[]): { width: number; height: number; hasExpandedTarget: boolean } {
  let width = 0;
  let height = 0;
  let hasExpandedTarget = false;

  for (const cls of classList) {
    if (cls.includes('after:-inset') || cls.includes('after:inset') || cls.includes('touch-expansion')) {
      hasExpandedTarget = true;
    }

    // Direct pixel sizes
    const minWMatch = cls.match(/min-w-\[(\d+)px\]/);
    if (minWMatch) width = Math.max(width, parseInt(minWMatch[1], 10));

    const minHMatch = cls.match(/min-h-\[(\d+)px\]/);
    if (minHMatch) height = Math.max(height, parseInt(minHMatch[1], 10));

    const wMatch = cls.match(/^w-\[(\d+)px\]$/);
    if (wMatch) width = Math.max(width, parseInt(wMatch[1], 10));

    const hMatch = cls.match(/^h-\[(\d+)px\]$/);
    if (hMatch) height = Math.max(height, parseInt(hMatch[1], 10));

    // Tailwind standard spacing (1 = 4px)
    if (cls === 'w-6') width = Math.max(width, 24);
    if (cls === 'h-6') height = Math.max(height, 24);
    if (cls === 'w-7') width = Math.max(width, 28);
    if (cls === 'h-7') height = Math.max(height, 28);
    if (cls === 'w-8') width = Math.max(width, 32);
    if (cls === 'h-8') height = Math.max(height, 32);
    if (cls === 'w-9') width = Math.max(width, 36);
    if (cls === 'h-9') height = Math.max(height, 36);
    if (cls === 'w-10') width = Math.max(width, 40);
    if (cls === 'h-10') height = Math.max(height, 40);
    if (cls === 'w-11') width = Math.max(width, 44);
    if (cls === 'h-11') height = Math.max(height, 44);
    if (cls === 'w-12') width = Math.max(width, 48);
    if (cls === 'h-12') height = Math.max(height, 48);
    if (cls === 'w-14') width = Math.max(width, 56);
    if (cls === 'h-14') height = Math.max(height, 56);
    if (cls === 'w-16') width = Math.max(width, 64);
    if (cls === 'h-16') height = Math.max(height, 64);
    if (cls === 'w-full') width = Math.max(width, 300);

    // Padding estimations if height not explicit
    if (cls === 'py-1' || cls === 'py-1.5') height = Math.max(height, 28);
    if (cls === 'py-2') height = Math.max(height, 36);
    if (cls === 'py-2.5') height = Math.max(height, 42);
    if (cls === 'py-3' || cls === 'py-3.5' || cls === 'py-4') height = Math.max(height, 48);

    if (cls === 'p-1.5') {
      width = Math.max(width, 26);
      height = Math.max(height, 26);
    }
    if (cls === 'p-2') {
      width = Math.max(width, 32);
      height = Math.max(height, 32);
    }
    if (cls === 'p-2.5') {
      width = Math.max(width, 40);
      height = Math.max(height, 40);
    }
    if (cls === 'p-3' || cls === 'p-3.5' || cls === 'p-4') {
      width = Math.max(width, 48);
      height = Math.max(height, 48);
    }
  }

  return { width, height, hasExpandedTarget };
}

export function evaluateTouchTarget(elementHtml: string): TouchTargetAssessment {
  const tagMatch = elementHtml.match(/^<([a-z0-9]+)/i);
  const tag = tagMatch ? tagMatch[1] : 'unknown';

  const classMatch = elementHtml.match(/class="([^"]*)"/);
  const className = classMatch ? classMatch[1] : '';
  const classList = className.split(/\s+/).filter(Boolean);

  const textMatch = elementHtml.replace(/<[^>]*>/g, '').trim().substring(0, 30);

  const { width, height, hasExpandedTarget } = estimateDimensionFromClasses(classList);

  let isCompliant = (width >= 44 && height >= 44) || hasExpandedTarget;

  // Full-width buttons with height >= 44px are compliant
  if (classList.includes('w-full') && height >= 44) {
    isCompliant = true;
  }

  let reason = isCompliant ? 'Meets or exceeds 44x44px' : `Estimated dimensions ${width}x${height}px < 44x44px minimum`;
  if (hasExpandedTarget) {
    reason = 'Compliant via expanded touch target overlay';
  }

  return {
    tag,
    className,
    textSnippet: textMatch,
    isCompliant,
    estimatedWidth: width,
    estimatedHeight: height,
    reason,
  };
}

export function extractInteractiveElements(html: string): string[] {
  const matches: string[] = [];
  // Match buttons, inputs, links with href, and role="button"|"tab"|"checkbox"
  const regex = /<(button|input|a\s+[^>]*href|div\s+[^>]*role="(button|tab|checkbox)")[^>]*>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    matches.push(match[0]);
  }
  return matches;
}
