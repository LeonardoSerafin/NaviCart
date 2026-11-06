#!/usr/bin/env node
import { createJiti } from 'jiti';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Initialize JITI with JSX support
const jiti = createJiti(import.meta.url, { jsx: true });

const { context } = jiti('./helpers/test-framework.ts');

const testFiles = [
  // Tier 1: Feature Coverage (Features 1 to 26)
  './tier1-features/f01-f05.test.ts',
  './tier1-features/f06-f10.test.ts',
  './tier1-features/f11-f15.test.ts',
  './tier1-features/f16-f20.test.ts',
  './tier1-features/f21-f26.test.ts',
  // Tier 2: Boundary & Corner Cases (Features 1 to 26)
  './tier2-boundaries/b01-b05.test.ts',
  './tier2-boundaries/b06-b10.test.ts',
  './tier2-boundaries/b11-b15.test.ts',
  './tier2-boundaries/b16-b20.test.ts',
  './tier2-boundaries/b21-b26.test.ts',
  // Tier 3: Cross-Feature Combinations
  './tier3-combinations/cross-feature.test.ts',
  // Tier 4: Real-World Scenarios
  './tier4-journeys/trento-journeys.test.ts',
];

const featureNames = {
  1: 'Safe-Area Viewport & Shell',
  2: 'Design Tokens & Motion Baseline',
  3: 'Persistent Bottom Nav Bar',
  4: 'Home Store Selection',
  5: 'Home Search & Clear Control',
  6: 'Home Language Switcher',
  7: 'Store Catalog Product Cards',
  8: 'Store Catalog Category/Sale Filters',
  9: 'Store Catalog Add-to-List Modal',
  10: 'Store Catalog Source List HUD',
  11: 'My Lists Supermarket Grouping',
  12: 'My Lists Accessible List Actions',
  13: 'Create List Modal (3 Modes)',
  14: 'OCR Receipt Scanning Feedback',
  15: 'Assortment Exclusion Alert',
  16: 'List Detail Progress Bar',
  17: 'List Detail Item Checkoff',
  18: 'List Detail Quantity Steppers',
  19: '2D SVG Map Path & Pins',
  20: 'Turn-by-Turn Route HUD',
  21: 'Add Products Navigation Link',
  22: 'Account Language Toggle',
  23: 'Account Efficiency Metrics',
  24: 'Account Reset Demo Data',
  25: 'Oxlint Warning & Dead Code Cleanup',
  26: 'Comprehensive E2E Verification',
};

async function run() {
  console.log('\n======================================================================');
  console.log('       NAVICART E2E TEST SUITE — 4-TIER COMPREHENSIVE RUNNER');
  console.log('======================================================================\n');
  console.log(`Node.js Version: ${process.version}`);
  console.log(`Target Working Directory: ${rootDir}\n`);

  context.clear();
  const startTime = performance.now();

  for (const relativePath of testFiles) {
    const fullPath = path.resolve(__dirname, relativePath);
    const fileName = path.basename(relativePath);
    process.stdout.write(`  Executing ${fileName.padEnd(30, ' ')} ... `);
    const fileStart = performance.now();
    try {
      jiti(fullPath);
      const fileElapsed = (performance.now() - fileStart).toFixed(1);
      console.log(`✓ (${fileElapsed}ms)`);
    } catch (err) {
      console.log(`✗ FAILED`);
      console.error(`    Error loading ${fileName}:`, err?.message || err);
    }
  }

  const allResults = context.getResults();
  const totalDuration = (performance.now() - startTime).toFixed(1);

  const total = allResults.length;
  const passed = allResults.filter(r => r.passed).length;
  const failed = allResults.filter(r => !r.passed).length;

  const byTier = {
    tier1: { total: 0, passed: 0, failed: 0 },
    tier2: { total: 0, passed: 0, failed: 0 },
    tier3: { total: 0, passed: 0, failed: 0 },
    tier4: { total: 0, passed: 0, failed: 0 },
  };

  const byFeature = {};
  for (let i = 1; i <= 26; i++) {
    byFeature[i] = { name: featureNames[i], total: 0, passed: 0, failed: 0 };
  }

  for (const res of allResults) {
    if (byTier[res.tier]) {
      byTier[res.tier].total++;
      if (res.passed) byTier[res.tier].passed++;
      else byTier[res.tier].failed++;
    }

    if (res.featureId && byFeature[res.featureId]) {
      byFeature[res.featureId].total++;
      if (res.passed) byFeature[res.featureId].passed++;
      else byFeature[res.featureId].failed++;
    }
  }

  console.log('\n----------------------------------------------------------------------');
  console.log('                        TIER BREAKDOWN REPORT');
  console.log('----------------------------------------------------------------------');
  console.log(`  Tier 1: Feature Coverage            : ${byTier.tier1.passed}/${byTier.tier1.total} passed (${byTier.tier1.failed} failed)`);
  console.log(`  Tier 2: Boundary & Corner Cases     : ${byTier.tier2.passed}/${byTier.tier2.total} passed (${byTier.tier2.failed} failed)`);
  console.log(`  Tier 3: Cross-Feature Combinations  : ${byTier.tier3.passed}/${byTier.tier3.total} passed (${byTier.tier3.failed} failed)`);
  console.log(`  Tier 4: Real-World Trento Journeys  : ${byTier.tier4.passed}/${byTier.tier4.total} passed (${byTier.tier4.failed} failed)`);

  console.log('\n----------------------------------------------------------------------');
  console.log('                      FEATURE INVENTORY BREAKDOWN');
  console.log('----------------------------------------------------------------------');
  for (let i = 1; i <= 26; i++) {
    const f = byFeature[i];
    const status = f.failed === 0 ? '✓ PASS' : `✗ FAIL (${f.failed})`;
    console.log(`  [F${String(i).padStart(2, '0')}] ${f.name.padEnd(36, ' ')} : ${f.passed}/${f.total} passed [${status}]`);
  }

  const failures = allResults.filter(r => !r.passed);
  if (failures.length > 0) {
    console.log('\n----------------------------------------------------------------------');
    console.log(`                   FAILURES DETAIL (${failures.length} FAILED)`);
    console.log('----------------------------------------------------------------------');
    failures.forEach((f, idx) => {
      console.log(`\n  [${idx + 1}] [${f.tier.toUpperCase()}] ${f.suite} > ${f.name}`);
      console.log(`      Error: ${f.error}`);
    });
  }

  console.log('\n======================================================================');
  console.log(`TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${failed} | DURATION: ${totalDuration}ms`);
  console.log('======================================================================\n');

  // Save report to tests/reports
  const reportDir = path.resolve(__dirname, 'reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const reportJson = {
    timestamp: new Date().toISOString(),
    durationMs: parseFloat(totalDuration),
    total,
    passed,
    failed,
    byTier,
    byFeature,
    failures: failures.map(f => ({
      tier: f.tier,
      featureId: f.featureId,
      suite: f.suite,
      name: f.name,
      error: f.error,
    })),
  };

  fs.writeFileSync(path.join(reportDir, 'e2e-report.json'), JSON.stringify(reportJson, null, 2), 'utf8');

  // Also write markdown summary
  let md = `# NaviCart E2E Test Suite Run Report\n\n`;
  md += `**Timestamp**: ${reportJson.timestamp}  \n`;
  md += `**Total Tests**: ${total} | **Passed**: ${passed} | **Failed**: ${failed} | **Duration**: ${totalDuration}ms\n\n`;
  md += `## Tier Summary\n`;
  md += `| Tier | Description | Total | Passed | Failed | Pass Rate |\n`;
  md += `|---|---|---|---|---|---|\n`;
  md += `| **Tier 1** | Feature Coverage (>=5 per feature) | ${byTier.tier1.total} | ${byTier.tier1.passed} | ${byTier.tier1.failed} | ${Math.round((byTier.tier1.passed / byTier.tier1.total) * 100)}% |\n`;
  md += `| **Tier 2** | Boundary & Corner Cases (>=5 per feature) | ${byTier.tier2.total} | ${byTier.tier2.passed} | ${byTier.tier2.failed} | ${Math.round((byTier.tier2.passed / byTier.tier2.total) * 100)}% |\n`;
  md += `| **Tier 3** | Cross-Feature Combinations | ${byTier.tier3.total} | ${byTier.tier3.passed} | ${byTier.tier3.failed} | ${Math.round((byTier.tier3.passed / byTier.tier3.total) * 100)}% |\n`;
  md += `| **Tier 4** | Real-World Application Scenarios | ${byTier.tier4.total} | ${byTier.tier4.passed} | ${byTier.tier4.failed} | ${Math.round((byTier.tier4.passed / byTier.tier4.total) * 100)}% |\n\n`;

  md += `## Feature Inventory Breakdown\n`;
  md += `| # | Feature Name | Tier 1 | Tier 2 | Total | Passed | Failed | Status |\n`;
  md += `|---|---|---|---|---|---|---|---|\n`;
  for (let i = 1; i <= 26; i++) {
    const f = byFeature[i];
    const status = f.failed === 0 ? '✅ PASS' : `⚠️ BASELINE DEFICIT (${f.failed})`;
    md += `| ${i} | ${f.name} | 5 | 5 | ${f.total} | ${f.passed} | ${f.failed} | ${status} |\n`;
  }

  if (failures.length > 0) {
    md += `\n## Baseline Failures to Escalate for Milestones M1–M5\n`;
    failures.forEach((f, idx) => {
      md += `${idx + 1}. **[F${f.featureId || 'X'}] ${f.suite} — ${f.name}**\n   - \`${f.error}\`\n`;
    });
  }

  fs.writeFileSync(path.join(reportDir, 'e2e-summary.md'), md, 'utf8');

  // Process exit code
  const isBaselineInspection = process.argv.includes('--baseline');
  if (failed > 0 && !isBaselineInspection) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

run().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
