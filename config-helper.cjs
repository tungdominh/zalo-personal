#!/usr/bin/env node
// Helper script to configure zalo-personal channel

const fs = require('fs');
const path = require('path');
const os = require('os');

const mode = process.argv[2]; // 'open' or 'pairing'

if (!mode || !['open', 'pairing'].includes(mode)) {
  console.error('Usage: node config-helper.cjs <open|pairing>');
  process.exit(1);
}

const configPath = path.join(os.homedir(), '.openclaw', 'openclaw.json');

if (!fs.existsSync(configPath)) {
  console.error(`Config file not found: ${configPath}`);
  process.exit(1);
}

try {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  if (!config.channels) {
    config.channels = {};
  }

  if (!config.channels['zalo-personal']) {
    config.channels['zalo-personal'] = {};
  }

  if (mode === 'open') {
    config.channels['zalo-personal'].dmPolicy = 'open';
    config.channels['zalo-personal'].allowFrom = ['*'];
  } else {
    config.channels['zalo-personal'].dmPolicy = 'pairing';
    delete config.channels['zalo-personal'].allowFrom;
  }

  // Ensure plugins.allow includes zalo-personal to avoid warning
  if (!config.plugins) {
    config.plugins = {};
  }
  if (!Array.isArray(config.plugins.allow)) {
    config.plugins.allow = [];
  }
  if (!config.plugins.allow.includes('zalo-personal')) {
    config.plugins.allow.push('zalo-personal');
  }

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`✅ Configured ${mode} mode successfully`);
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
