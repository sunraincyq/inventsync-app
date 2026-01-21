const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [workspaceRoot];

// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Force Metro to resolve 'react' and 'react-native' ONLY from the local node_modules
// Using blockList (newer Metro) instead of blacklistRE
config.resolver.blockList = [
    /node_modules\/.*\/node_modules\/react\/.*/,
    new RegExp(
        `^${escape(path.resolve(workspaceRoot, 'node_modules/react'))}\\/.*$`
    ),
    new RegExp(
        `^${escape(path.resolve(workspaceRoot, 'node_modules/react-native'))}\\/.*$`
    ),
    new RegExp(
        `^${escape(path.resolve(workspaceRoot, 'node_modules/@expo'))}\\/.*$`
    ),
];

function escape(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = config;
