#! /usr/bin/env node

/**
  Node script: check_translations.js
  Purpose : To check through a set of local repositories to see if localization has been set up.
  See-also: https://github.com/intervalia/checkLocales for a tool to check the validity of locale files.
**/

const fs = require('fs');
const path = require('path');

const whereToSearch = 'fs-components';
const baseLocalizationFileToCheckFor = /_en\.json$/;
const autoLocalizationFileToCheckFor = '_eo.json';

// Recursive directory searcher function
function searchDir(startPath, filter, callback) {

  if (!fs.existsSync(startPath)) {
    console.log("Directory not found: ", startPath);
    return;
  }

  var files = fs.readdirSync(startPath);
  for(var i = 0; i < files.length; i++) {
    var filename = path.join(startPath, files[i]);
    var stat = fs.lstatSync(filename);
    // Exclude node_modules or bower_components directories
    if (stat.isDirectory() && filename.indexOf('bower_components') == -1 && filename.indexOf('node_modules') == -1 && filename.indexOf('/dist/') == -1 && filename.indexOf('.git') == -1) {
        // console.log(filename);
        searchDir(filename, filter, callback); //recurse
    }
    else if (filter.test(filename)) callback(filename);
  };
};

// Get a list of all directories to parse for locale folders
var directoryToParse = path.resolve(whereToSearch);
console.log('\nSearching', directoryToParse, 'for locale files...\n');

// Then do the file search
searchDir(directoryToParse, baseLocalizationFileToCheckFor, function(filename) {
  var shortPath = filename.slice(filename.indexOf(whereToSearch) + whereToSearch.length + 1);
  var autoLocalizationFilePath = filename.replace(baseLocalizationFileToCheckFor, autoLocalizationFileToCheckFor);

  if (!fs.existsSync(autoLocalizationFilePath)) {
    console.log("WARNING: corresponding auto-localization file not found for:", shortPath);
    return;
  }

  // TODO: Also check to see if all localization files exist
});
