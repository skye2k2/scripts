#! /usr/bin/env node

/* --------------------------------------------------------------------------------
Script: fetch-credentials.js
Author: Clif Bergmann (skye2k2)
Date: September 2018
Purpose: Retrieve a user's GitHub credentials (login, password) from a local .netrc file for use in combination with scripts making use of the Github API.
Use: fetchCredentials = require('./fetch-credentials.js'); credentials = await fetchCredentials.get();
-------------------------------------------------------------------------------- */

var fs = require('fs');
var util = require('util');
fs.readFileAsync = util.promisify(fs.readFile);
this.credentials = {};

// Read GitHub credentials from user's .netrc file
async function get () {
  if (this.credentials && Object.keys(this.credentials).length > 0) {
    return this.credentials;
  }

  try {
    var data = await fs.readFileAsync(process.env.HOME + '/.netrc', 'utf8');

    // Parse .netrc contents into machine definitions
    // Taken from: https://github.com/camshaft/netrc/blob/master/index.js
    // Remove comments
    var lines = data.split('\n');
    for (var n in lines) {
      var i = lines[n].indexOf('#');
      if (i > -1) lines[n] = lines[n].substring(0, i);
    }
    data = lines.join('\n');

    var tokens = data.split(/[ \t\n\r]+/);
    var machines = {};
    var m = null;
    var key = null;

    // if first index in array is empty string, strip it off (happens when first line of file is comment. Breaks the parsing)
    if (tokens[0] === '') tokens.shift();

    for (var j = 0, key, value; j < tokens.length; j += 2) {
      key = tokens[j];
      value = tokens[j + 1];

      // Whitespace
      if (!key || !value) continue;

      // We have a new machine definition
      if (key === 'machine') {
        m = {};
        machines[value] = m;
      } else {
        m[key] = value;
      }
    }

    this.credentials = machines['raw.github.com'];
  } catch (err) {
    return console.log('ERROR: Could not read .netrc file for GitHub credentials');
  }
  return this.credentials;
}

module.exports = {
  get
};
