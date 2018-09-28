#! /usr/bin/env node

/* --------------------------------------------------------------------------------
Script: fetch-repos.js
Author: Clif Bergmann (skye2k2)
Date: September 2018
Purpose: Retrieve a list of repositories via the GitHub API for given organizations with a given topic.
Use: fetchRepos = require('./fetch-repos.js'); repos = await fetchRepos.get();
-------------------------------------------------------------------------------- */

var https = require('https');
var fetchCredentials = require('./fetch-credentials.js');

// TODO: Allow passing a list of repos to ignore.
// TODO: Utilize util.promisify on both https and res.on and await on each one in order to potentially avoid grossness.
async function get (ORGS = 'org:fs-webdev+org:fs-eng', TOPIC = 'tw-gold') {
  const urlPath = '/search/repositories\?q\=fork:true+' + ORGS + '+topic:' + TOPIC;
  try {
    this.credentials = await fetchCredentials.get();
    return smartGithubCall(urlPath);
  } catch (err) {
    console.log('Error getting repos: ', err);
    return [];
  }
}

// Call the GitHub API to search for repositories that have the specified topic in the specified org(s).
async function smartGithubCall (urlPath, repos = []) {
  return await new Promise((resolve, reject) => {
    https.get({
      auth: this.credentials.login + ':' + this.credentials.password,
      headers: {'User-Agent': this.credentials.login},
      host: 'api.github.com',
      path: urlPath,
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

          if (!data.items || !data.items.length) {
            console.warn('No repositories found');
          }

          data.items.forEach((repo) => {
            repos.push(repo.full_name);
          });
          repos.sort();

          // Determine if there are multiple pages of results, and request them, too
          if (res.headers.link.indexOf('next') > 0) {
            var nextUrl = res.headers.link.substr(res.headers.link.indexOf('<') + 1, res.headers.link.indexOf('>') - 1);

            if (nextUrl) {
              resolve(await smartGithubCall(nextUrl, repos));
            }
          }
          // console.log(repos);
          resolve(repos);
        });
      } catch (err) {
        console.log(err);
        reject(new Error());
      }
    });
  });
}

module.exports = {
  get
};
