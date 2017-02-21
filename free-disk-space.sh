#! /bin/bash
set -o errexit
set -o pipefail

# --------------------------------------------------------------------------------
# Script: free-disk-space.sh
# Author: Clif Bergmann (skye2k2)
# Date: Dec 2016
# Purpose: Especially as a developer, package, library, and cache files will occasionally take up large amounts of disk space, slowing down searching and backups. The following is a set of scripts that I run to tidy up.
# Use: Download and set the execute bit `chmod +x free-disk-space.sh`, then run `./free-disk-space.sh`.
# Note: Requires sudo permissions for some commands, and can run for several minutes. Can be run from any location.
# --------------------------------------------------------------------------------

if [ "$(whoami)" == "root" ]; then
  echo "Do not run this script as the root user because brew panics when you do so."
  exit 1
fi

echo "Cleaning up...eww, this may take a while..."

# Use tr to convert multiple consecutive spaces to a tab (the default delimiter of cut), then grep for disk1 (mac default) and return the available disk space (4th field).
SPACE_BEFORE="Available disk space (before): $(df -ht | tr -s ' ' $'\t' | grep disk1 | cut -f4)"

# Remove all system logs
sudo rm -rf /private/var/log/*

# Remove all node_modules and bower_components directories
find . -name "node_modules" -exec rm -rf '{}' +
find . -name "bower_components" -exec rm -rf '{}' +

# Clear application-specific caches (exclude apple- and browser-specific caches)
# NOTE: Disabled application cache clearing, due to inadvertently destroying SourceTree's ability to catch new changes
# find ~/Library/Caches/* -maxdepth 1 -not -path "*/com.*" -not -path "*/Google*" -type d -exec rm -rf '{}' +
# sudo find /Library/Caches/* -maxdepth 1 -not -path "*/com.*" -not -path "*Metadata*" -not -path "*/Google*" -type d  -exec rm -rf '{}' +

# Remove cached packages from common package managers
npm cache clean
bower cache clean
brew cleanup

# Show before/after available disk space
echo -e "\n$SPACE_BEFORE"
echo "Available disk space (after): " "$(df -ht | tr -s ' ' $'\t' | grep disk1 | cut -f4)"
