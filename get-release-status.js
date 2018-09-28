#! /usr/bin/env node

/* --------------------------------------------------------------------------------
Script: get-release-status.js
Author: Clif Bergmann (skye2k2)
Date: September 2018
Purpose: Retrieve a list of latest unreleased changes for a set of repositories for given organizations with a given topic.
Use: ./get-release-status.js
-------------------------------------------------------------------------------- */

var https = require('https');
var fetchCredentials = require('./fetch-credentials.js');
var fetchRepos = require('./fetch-repos.js');

// TODO: Utilize util.promisify on both https and res.on and await on each one in order to potentially avoid grossness.
async function get (ORGS = 'org:fs-webdev+org:fs-eng', TOPIC = 'tw-gold') {
  try {
    // fetchLatestReleaseLocal = fetchLatestRelease;
    this.credentials = await fetchCredentials.get();
    this.repos = await fetchRepos.get();
    this.repos.forEach(async (repo) => {
      var release = await fetchLatestRelease(repo);
      await fetchCommitsSinceLastRelease(repo, release.tag_name, release.published_at);
      // TODO: Instead of just logging out, group results
    });
  } catch (err) {
    console.log('Error getting information: ', err);
    return [];
  }
}

// Call the GitHub API to get the last release details.
async function fetchLatestRelease (repo) {
  return await new Promise((resolve, reject) => {
    https.get({
      auth: this.credentials.login + ':' + this.credentials.password,
      headers: {'User-Agent': this.credentials.login},
      host: 'api.github.com',
      path: '/repos/' + repo + '/releases/latest',
      port: '443'
    }, (res) => {
      // explicitly treat incoming data as utf8 (avoids issues with multi-byte chars)
      res.setEncoding('utf8');

      // incrementally capture the incoming response body
      var data = '';
      res.on('data', function (d) {
        data += d;
      });

      try {
        res.on('end', async () => {
          try {
          // console.log(res);
            var parsed = JSON.parse(data);
          } catch (err) {
            console.error(res.headers);
            console.error('Unable to parse response as JSON');
            return {};
          }

          resolve({tag_name: parsed.tag_name, published_at: parsed.published_at});
        });
      } catch (err) {
        console.log(err);
        reject(new Error());
      }
    });
  });
}

// Call the GitHub API to search commits since the last release.
async function fetchCommitsSinceLastRelease (repo, tag, published) {
  return await new Promise((resolve, reject) => {
    if (!tag || !published) {
      console.log('NONE:\t \x1b[31m%s\x1b[0m', repo, tag, published);
      resolve();
    }

    https.get({
      auth: this.credentials.login + ':' + this.credentials.password,
      headers: {'User-Agent': this.credentials.login},
      host: 'api.github.com',
      path: '/repos/' + repo + '/commits?since=' + published,
      port: '443'
    }, (res) => {
      // Explicitly treat incoming data as utf8 (avoids issues with multi-byte chars)
      res.setEncoding('utf8');

      // Incrementally capture the incoming response body
      var data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      try {
        res.on('end', async () => {
          data = JSON.parse(data);

          if (!data.length) {
            console.log("CURRENT: \x1b[32m%s\x1b[0m'", repo, tag, published);
          } else {
            console.log('STALE:\t \x1b[31m%s\x1b[0m', repo, tag, published);
            // NOTE: We currently only show the most recent 30 commits
            data.forEach(function (result) {
              if (result.commit.message.indexOf('\n\n') > 0) {
                console.log('\t', result.commit.message.substring(0, result.commit.message.indexOf('\n\n')));
              } else {
                console.log('\t', result.commit.message);
              }
            });
          }
          resolve();
        });
      } catch (err) {
        console.log(err);
        reject(new Error());
      }
    });
  });
}

get();

module.exports = {
  get,
  fetchLatestRelease
};
