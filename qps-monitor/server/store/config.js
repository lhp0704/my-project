const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../../config/local.json');
const DEFAULT_CONFIG_PATH = path.join(__dirname, '../../config/default.json');

let currentConfig = null;

function loadConfig() {
  if (currentConfig) return currentConfig;

  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf8');
      currentConfig = JSON.parse(data);
    } else {
      const data = fs.readFileSync(DEFAULT_CONFIG_PATH, 'utf8');
      currentConfig = JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load config:', e);
    const data = fs.readFileSync(DEFAULT_CONFIG_PATH, 'utf8');
    currentConfig = JSON.parse(data);
  }

  return currentConfig;
}

function saveConfig(config) {
  try {
    const configDir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    currentConfig = config;
    return true;
  } catch (e) {
    console.error('Failed to save config:', e);
    return false;
  }
}

function getConfig() {
  return loadConfig();
}

function updateConfig(updates) {
  const config = loadConfig();
  const newConfig = { ...config, ...updates };
  if (saveConfig(newConfig)) {
    return newConfig;
  }
  return null;
}

module.exports = {
  getConfig,
  updateConfig,
  loadConfig,
  saveConfig
};
