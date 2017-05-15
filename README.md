# scripts

Home of bash/node scripts that may or may not be useful in web development activities. These are often scripts that I have written for fairly specific use cases, but may be useful to others in a general sense.

## free-disk-space.sh

Set of commands to clean up package, library, and cache files that tend to grow to take up large amounts of disk space, slowing down searching and backups. Can be run from any location.

- Removes brew- node- and bower-related extra files
- Clears all system logs
- Empties many application caches. *Note: Removing Google Chrome's application cache causes webpages to initially load without external assets, hence the exclusion.*

**To-Do:**

- Incorporate progress bar
- Do the math to show space freed

## gitmanage.sh

Set of commands to for a specified set of GitHub repositories, which allow for updating, installing, testing, and even generating contributor statistics for each. *Note: Currently position-sensitive, and requires configuration before running.*

### Options:

    -c	  check     Output the list of GitHub directories that *would* have been updated. Supercedes all other flags.
    -d    deps      Update the package dependencies (IN-PROGRESS)
    -f    full    	Do a full install. Remove node_modules/bower_components/components and then install based on the package lists present; run `cake env:setup` if Cakefile is present.
    -g    git-fame  Generate git-fame report (depends on https://github.com/oleander/git-fame-rb)
    -t	  test		Run unit tests via `npm test` or `wct --skip-plugin sauce`, determined by presence of package.json/bower.json. Open coverage results.
    -u    update  	Update repository, stashing changes, if needed.

**To-Do:**

- Optionally update npm/bower depencencies

## pr-summary.js

Automated script that retrieves a list of all open pull requests for a defined set of repositories. *Note: Requires ~/.netrc file to be present and valid.*

**To-Do:**

- Add parameter to exclude assinged PR's
- Add parameter to specify newest or oldest PR's first
- Incorporate promises for GET requests, so we know when we're done, and can then sort/group as desired
