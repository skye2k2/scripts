#! /usr/bin/env node

/* --------------------------------------------------------------------------------
Script: pr-summary.js
Author: Clif Bergmann (skye2k2)
Date: May 2017
Purpose: Retrieve a list of all open pull requests for a set of repositories for given organizations with a given topic.
Use: Download and set the execute bit `chmod +x pr-summary.js`, modify the TOPIC variable to be the topic desired and the ORGS variable to contain the organizations to search (that you have access to), then run `./pr-summary.js`. Utilizes GitHub API and plaintext credentials from the user's .netrc file.
-------------------------------------------------------------------------------- */
var TOPIC = 'tw-gold';
var ORGS = 'org:fs-webdev+org:fs-eng';

var https = require("https");
var fs = require("fs");
var prs = [];
var credentials = {};
var repositories = [];

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

  fetchRepos();
});

// Check orgs for repos with matching topic
function fetchRepos () {
  https.get({
    auth: credentials.login + ":" + credentials.password,
    headers: {'User-Agent': credentials.login},
    host: 'api.github.com',
    path: '/search/repositories\?q\=fork:true+' + ORGS + '+topic:' + TOPIC,
    port: '443'
  }, (res) => {
    // explicitly treat incoming data as utf8 (avoids issues with multi-byte chars)
    res.setEncoding('utf8');

    var data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      data = JSON.parse(data);

      if (!data.items || !data.items.length) {
        console.warn("No repositories found matching the topic: ", TOPIC);
      }

      data.items.forEach((repo) => {
        repositories.push(repo.full_name);
        repositories.sort();
      });

      // console.log(repositories);

      repositories.forEach(function (repo) {
        fetchPRs(repo, addToList);
      });
    });
  });
}

// Check a given repository for outstanding pull requests
function fetchPRs (repo, cb) {
  https.get({
    auth: credentials.login + ":" + credentials.password,
    headers: {
      "User-Agent": credentials.login
    },
    host: "api.github.com",
    path: "/repos/" + repo + "/pulls?state=open&sort=created&direction=asc"
  }, function(res) {
    // explicitly treat incoming data as utf8 (avoids issues with multi-byte chars)
    res.setEncoding('utf8');

    // incrementally capture the incoming response body
    var data = '';
    res.on('data', function(d) {
        data += d;
    });

    res.on('end', function() {
      try {
        var parsed = JSON.parse(data);
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

    pr.created_at = new Date(pr.created_at);
    pr.formattedDate = pr.created_at.getFullYear() + "-" + (pr.created_at.getMonth() + 1) +  "-" + pr.created_at.getDate() + " " + pr.created_at.toTimeString().substr(0, 8);

    prs[repo].push({
      url: pr.html_url,
      title: pr.title,
      user: pr.user.login,
      date: pr.created_at,
      formattedDate: pr.formattedDate
    });

    // JUST PRINT EVERYTHING OUT AS YOU GET IT, SO YOU DON'T HAVE TO WORRY ABOUT PROMISES
    // TODO: Instrument promise format to allow for global sorting/grouping.
    console.log(pr.formattedDate + "\t" + pr.user.login + " submitted: '" + pr.title + "' " + pr.html_url + assignee);
  }
}
