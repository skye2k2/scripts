#! /bin/bash
## -eux

# --------------------------------------------------------------------------------
# Script: update-install-test.sh
# Author: Clif Bergmann (skye2k2)
# Date: Dec 2016
# Purpose: Update a specific set of repositories, and optionally npm/bower install, run tests, and open results on each.
# Use: Download and place/link in your least common directory under which you wish GitHub repositories to be updated, set the execute bit `chmod +x update-install-test.sh`, modify the REPOSITORIES find parameters then run `./update-install-test.sh`.
# --------------------------------------------------------------------------------

# Source of parameter-handling code: http://www.freebsd.org/cgi/man.cgi?query=getopt
args=`getopt dfht $*`

if [ $? -ne 0 ]; then
  echo -e "options:
  -d: dry-run: just return what directories *would* have been updated. Supercedes all other flags
  -f: full: remove node_modules, npm link, cake env:setup
  -h: show this help menu
  -t: test: run unit tests and open results"
  exit 2
fi

set -- $args

while true; do
  case "$1" in
    # TODO: Make specific cases to set boolean flags for each option
    -d|-f|-t)
      sflags="${1#-}$sflags"
      shift
    ;;
    -h)
      echo -e "options:
      -d: dry-run: just return what directories *would* have been updated. Supercedes all other flags
      -f: full: remove node_modules/bower_components, npm link, cake env:setup
      -t: test: run unit tests and open results"
      exit 2
    ;;
    --)
      shift; break
    ;;
  esac
done

DIRECTORY_PATH="${PWD}"

# function runCommands determines which commands to run, based on passed-in arguments, presence of specific files, and previous Git command results
# @param string $1 - Path to Git command logfile. Will contain any errors Git encountered
# @param string $2 - Path to repository. Used to check for existance of files that determine how assets are installed and tested
function runCommands {
  # If full flag (-f) enabled, do a clean install (link, so that local linking will work without needing to re-install)
  if [[ $sflags == *["f"]* ]]; then

    if [ -s "${2}/package.json" ]; then
      rm -rf "${2}/node_modules"
      npm link -q
    fi

    if [ -s "${2}/bower.json" ]; then
      rm -rf "${2}/bower_components"
      bower install -sf
      bower link
    fi

    if [ -s "${2}/Cakefile" ]; then
      cake env:setup
    fi
  fi

  # If test flag (-t) enabled, run unit tests and open coverage results
  if [[ $sflags == *["t"]* ]]; then

    if [ -s "${2}/package.json" ]; then
      npm test

      # open coverage results pages (move below both if blocks once coverage is integrated into the web component repositories)
      open -a /Applications/Google\ Chrome.app reports/coverage/client/html/index.html
    else
      if [ -s "${2}/bower.json" ]; then
        wct --skip-plugin sauce
        # polymer test --skip-plugin sauce --local chrome
      fi
    fi
  fi

  # remove log file if Git commands successful (empty)
  if [ ! -s "$1" ]; then
    rm "$1"
  fi
}

# http://stackoverflow.com/questions/8213328/bash-script-find-output-to-array
# Insert your own repository sub-folders into the multi-find statement below; ex: find $DIRECTORY_PATH/fs-components $DIRECTORY_PATH/downstream
REPOSITORIES=()
while IFS= read -d $'\0' -r REPO_PATH ; do
   REPOSITORIES=("${REPOSITORIES[@]}" "$REPO_PATH")
done < <(find $DIRECTORY_PATH/downstream -type d -maxdepth 1 -mindepth 1 -print0)

if [ "${#REPOSITORIES[@]}" -gt 1 ]; then
  echo -e "${#REPOSITORIES[@]} repositories:\n"
fi

# For each repository, update master and run additional selected commands
for REPO_PATH in "${REPOSITORIES[@]}" ; do
  REPO_NAME="${REPO_PATH##*/}"

  # Make sure a directory is a GitHub directory before updating
  GIT_FOLDER="$(find ${REPO_PATH}/.git -type d -maxdepth 0)"
  if [ ! -z "$GIT_FOLDER" ]; then
    # If dry-run flag (-d) enabled, just print out the GitHub repositories that *would* have been updated
    if [[ $sflags == *["d"]* ]]; then
      echo -e "$REPO_NAME"
      continue
    fi

    echo -e "Updating $REPO_NAME"
    cd $REPO_PATH
    LOGFILE="${DIRECTORY_PATH}/.${REPO_NAME}.results.txt"

    # Update repository, stashing if needed
    (git prune 2>&1) | tee ${LOGFILE}
    (git pull --quiet --rebase --all 2>&1) > ${LOGFILE}

    if grep -xqF "error: Cannot pull with rebase: You have unstaged changes." ${LOGFILE}; then
      echo -e "...uncommitted changes detected--stashing"
      (git stash save "Automated Stash" 2>&1) > ${LOGFILE}

      if grep -qF "Saved working directory and index state" ${LOGFILE}; then
        echo -e "...changes stashed"
        git checkout master
        (git pull --rebase --all 2>&1) > ${LOGFILE}
        runCommands $LOGFILE $REPO_PATH
      else
        echo -e "ERROR: Failed to stash changes. Check the log at: ${LOGFILE} for more detail"
      fi
    else
      echo -e "...${REPO_NAME} repository up-to-date."
      runCommands $LOGFILE $REPO_PATH
    fi
  fi
done

say "Job done--MAHSTER!"

#bash
