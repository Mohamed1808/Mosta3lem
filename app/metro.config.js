// Metro bundler config. The app's simulated backend runs the prototype's engine
// (../prototype/js) so both behave the same until the real API exists.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, '../prototype/js')];

module.exports = config;
