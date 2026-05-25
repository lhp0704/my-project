const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../../config/local.json');
const DEFAULT_CONFIG_PATH = path.join(__dirname, '../../config/default.json');

let currentConfig = null;

function normalizeConfig(config) {
  const normalized = {
    ...config,
    monitor: {
      ...(config.monitor || {})
    }
  };

  if (normalized.monitor.defaultSuccessCountThreshold === undefined &&
    normalized.monitor.defaultFailureThreshold !== undefined) {
    normalized.monitor.defaultSuccessCountThreshold = normalized.monitor.defaultFailureThreshold;
  }
  delete normalized.monitor.defaultFailureThreshold;

  if (Array.isArray(normalized.monitor.tasks)) {
    normalized.monitor.tasks = normalized.monitor.tasks.map((task) => {
      if (!task || typeof task !== 'object') {
        return task;
      }

      const normalizedTask = { ...task };
      if (normalizedTask.successCountThreshold === undefined &&
        normalizedTask.failureThreshold !== undefined) {
        normalizedTask.successCountThreshold = normalizedTask.failureThreshold;
      }
      delete normalizedTask.failureThreshold;
      return normalizedTask;
    });
  }

  return normalized;
}

function loadConfig() {
  if (currentConfig) return currentConfig;

  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf8');
      currentConfig = normalizeConfig(JSON.parse(data));
    } else {
      const data = fs.readFileSync(DEFAULT_CONFIG_PATH, 'utf8');
      currentConfig = normalizeConfig(JSON.parse(data));
    }
  } catch (e) {
    console.error('Failed to load config:', e);
    const data = fs.readFileSync(DEFAULT_CONFIG_PATH, 'utf8');
    currentConfig = normalizeConfig(JSON.parse(data));
  }

  return currentConfig;
}

function saveConfig(config) {
  try {
    const normalizedConfig = normalizeConfig(config);
    const configDir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(normalizedConfig, null, 2));
    currentConfig = normalizedConfig;
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
