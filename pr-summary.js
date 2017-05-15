#! /usr/bin/env node

/* --------------------------------------------------------------------------------
Script: pr-summary.js
Author: Clif Bergmann (skye2k2)
Date: May 2017
Purpose: Retrieve a list of all open pull requests for a set of repositories.
Use: Download and set the execute bit `chmod +x pr-summary.js`, modify the REPOSITORIES array to contain the repos you want to check, then run `./pr-summary.js`. Utilizes GitHub API and plaintext credentials from the user's .netrc file.
-------------------------------------------------------------------------------- */

// Array of repositories to check for PR's in. Format: "org/repo"
var REPOSITORIES = [
  "fs-webdev/component-catalog",
  "fs-webdev/polymer-element-catalog",
  "fs-webdev/core-elements",
  "fs-webdev/tree-service-elements",
  "fs-webdev/ui-elements",
  "fs-webdev/dialog-el",
  "fs-webdev/fs-add-person",
  "fs-webdev/fs-cache",
  "fs-webdev/fs-couple-renderer",
  "fs-webdev/fs-demo",
  "fs-webdev/fs-indicators",
  "fs-webdev/fs-indicators-flyout",
  "fs-webdev/fs-labelled-link",
  "fs-webdev/fs-life-events",
  "fs-webdev/fs-person-card",
  "fs-webdev/fs-person-card-service",
  "fs-webdev/fs-person-data-service",
  "fs-webdev/fs-person-summary-extended",
  "fs-webdev/fs-tree-person-renderer",
  "fs-webdev/fs-user-service",
  "fs-webdev/fs-watch",
  "fs-webdev/styles-wc",
  "fs-webdev/wc-i18n",
  "fs-webdev/tree"
];

var https = require("https");
var fs = require("fs");
var prs = [];
var credentials = {};

// Read GitHub credentials from user's .netrc file
fs.readFile(process.env.HOME + "/.netrc", "utf8", function (err, data) {
  if (err) {
    return console.log("could not read .netrc file for GitHub credentials");
  }

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
  machines = {};
  var m = null;
  var key = null;

  // if first index in array is empty string, strip it off (happens when first line of file is comment. Breaks the parsing)
  if (tokens[0] === '') tokens.shift();

  for(var i = 0, key, value; i < tokens.length; i+=2) {
    key = tokens[i];
    value = tokens[i+1];

    // Whitespace
    if (!key || !value) continue;

    // We have a new machine definition
    if (key === 'machine') {
      m = {};
      machines[value] = m;
    }
    // key=value
    else {
      m[key] = value;
    }
  }

  credentials = machines["raw.github.com"];

  REPOSITORIES.forEach(function (repo) {
    fetchPRs(repo, addToList);
  });
});

// Check a given repository for outstanding pull requests
function fetchPRs (repo, cb) {
  https.get({
    auth: credentials.login + ":" + credentials.password,
    headers: {
      "User-Agent": "skye2k2"
    },
    host: "api.github.com",
    path: "/repos/" + repo + "/pulls?state=open&sort=created&direction=asc"
  }, function(res) {
    // explicitly treat incoming data as utf8 (avoids issues with multi-byte chars)
    res.setEncoding('utf8');

    // incrementally capture the incoming response body
    var body = '';
    res.on('data', function(d) {
        body += d;
    });

    res.on('end', function() {
      try {
        var parsed = JSON.parse(body);
      } catch (err) {
        console.error(res.headers);
        console.error('Unable to parse response as JSON');
        return;
      }

      cb(repo, parsed);
    });
  }).on('error', function(err) {
      console.error('Request error:', err.message);
  });
}

function addToList (repo, pullRequestList) {
  if (pullRequestList && pullRequestList.length) {
    pullRequestList.forEach(function (pr) {
      addToListFunction(repo, pr);
    });
  }
}

// Parse and format PR's
function addToListFunction (repo, pr) {
  if (pr.url && pr.user && pr.user.login && pr.created_at) {
    if (!prs[repo]) {
      prs[repo] = [];
    }

    // Note assigned PR's
    var assignee = (pr.assignee)? " assigned to: " + pr.assignee.login : "";

    prs[repo].push({
      url: pr.html_url,
      title: pr.title,
      user: pr.user.login,
      date: new Date(pr.created_at)
    });

    pr.created_at = pr.created_at.replace(/[TZ]/g, " ")
    // JUST PRINT EVERYTHING OUT AS YOU GET IT, SO YOU DON'T HAVE TO WORRY ABOUT PROMISES
    // TODO: Instrument promise format to allow for global sorting/grouping.
    console.log(pr.created_at + "\t" + pr.user.login + " submitted: '" + pr.title + "' " + pr.html_url + assignee);
  }
}
