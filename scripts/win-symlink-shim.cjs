/**
 * Windows: allow Firebase/Next deploy without Developer Mode / elevation.
 * On EPERM, retry directory links as junctions; copy files instead of linking.
 */
"use strict";

const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

if (process.platform !== "win32") {
  module.exports = {};
  return;
}

const origSymlinkSync = fs.symlinkSync.bind(fs);
const origSymlink = fs.symlink.bind(fs);
const origPromiseSymlink = fsp.symlink.bind(fsp);

function absTarget(target, linkPath) {
  return path.isAbsolute(target)
    ? target
    : path.resolve(path.dirname(linkPath), target);
}

function isDirectory(targetPath) {
  try {
    return fs.statSync(targetPath).isDirectory();
  } catch {
    return false;
  }
}

function fallbackSync(target, linkPath) {
  const abs = absTarget(target, linkPath);
  if (isDirectory(abs)) {
    origSymlinkSync(abs, linkPath, "junction");
    return;
  }
  fs.copyFileSync(abs, linkPath);
}

fs.symlinkSync = function symlinkSync(target, linkPath, type) {
  try {
    return origSymlinkSync(target, linkPath, type);
  } catch (err) {
    if (err && (err.code === "EPERM" || err.code === "EACCES")) {
      try {
        return fallbackSync(target, linkPath);
      } catch {
        throw err;
      }
    }
    throw err;
  }
};

fs.symlink = function symlink(target, linkPath, type, callback) {
  if (typeof type === "function") {
    callback = type;
    type = undefined;
  }
  if (typeof callback === "function") {
    try {
      fs.symlinkSync(target, linkPath, type);
      process.nextTick(() => callback(null));
    } catch (err) {
      process.nextTick(() => callback(err));
    }
    return;
  }
  return new Promise((resolve, reject) => {
    fs.symlink(target, linkPath, type, (err) => (err ? reject(err) : resolve()));
  });
};

fsp.symlink = async function symlink(target, linkPath, type) {
  try {
    return await origPromiseSymlink(target, linkPath, type);
  } catch (err) {
    if (err && (err.code === "EPERM" || err.code === "EACCES")) {
      fallbackSync(target, linkPath);
      return;
    }
    throw err;
  }
};

module.exports = {};
