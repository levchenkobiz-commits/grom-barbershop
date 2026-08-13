#!/usr/bin/env node
/**
 * Guard the production delivery contract. This is intentionally static: it
 * prevents a later edit from silently reintroducing a VPS-local source copy.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/deploy.yml'), 'utf8');
const rules = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
const legacyWorkflow = path.join(root, '.github/workflows/deploy-vps.yml');
const required = [
  'actions/checkout@v4',
  'github.sha',
  '.release-version',
  '.release-manifest',
  'verify_previous_release',
  'flock -n',
  'adapter.js is runtime data',
];

for (const marker of required) {
  if (!workflow.includes(marker)) {
    throw new Error(`Release workflow lost required guard: ${marker}`);
  }
}
for (const forbidden of ['grom-dashboard-source', 'git reset --hard', 'git fetch origin master']) {
  if (workflow.includes(forbidden)) {
    throw new Error(`Release workflow must not use VPS source checkout: ${forbidden}`);
  }
}
if (!rules.includes('GitHub `master` — каноническая версия')) {
  throw new Error('AGENTS.md must name GitHub master as the canonical source.');
}
if (fs.existsSync(legacyWorkflow)) {
  throw new Error('Legacy deploy-vps workflow must not coexist with the verified release workflow.');
}

console.log('Release pipeline contract regression passed.');
