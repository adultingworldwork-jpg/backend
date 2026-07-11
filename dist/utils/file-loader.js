"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadFilesRecursively = loadFilesRecursively;
const fs_1 = require("fs");
const path_1 = require("path");
function loadFilesRecursively(dir) {
    const files = [];
    function scan(currentPath) {
        const entries = (0, fs_1.readdirSync)(currentPath, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = (0, path_1.join)(currentPath, entry.name);
            if (entry.isDirectory()) {
                scan(fullPath);
            }
            else {
                files.push(fullPath);
            }
        }
    }
    scan(dir);
    return files;
}
