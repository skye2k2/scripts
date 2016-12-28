# scripts

Home of scripts that may or may not be useful in web development activities. These are often scripts that I have written for fairly specific use cases, but may be useful to others in a general sense.

## free-disk-space.sh
	
Set of commands to clean up package, library, and cache files that tend to grow to take up large amounts of disk space, slowing down searching and backups. 

- Removes brew- node- and bower-related extra files
- Clears all system logs
- Empties many application caches. *Note: Removing Google Chrome's application cache causes webpages to initially load without external assets, hence the exclusion.*

**To-Do:**

- Incorporate progress bar
- Do the math to show space freed

## update-install-test.sh
	
Set of commands to update a specific set of GitHub repositories, and optionally npm/bower install, run tests, and open results on each. *Note: Currently position-sensitive, and requires configuration before running.*

**To-Do:**

- Optionally update npm/bower depencencies
- Intelligent detection of GitHub repositories 
- Parameterize depth to search a given directory
