#!/usr/bin/env bash
## -eux
set -o pipefail

# --------------------------------------------------------------------------------
# Script: gitmanage.sh
# Author: Clif Bergmann (skye2k2)
# Date: Dec 2016
# Purpose: Update a specific set of repositories, and optionally npm/bower install, run tests, and open results on each.
# Use: Download and place/link in your least common directory under which you wish GitHub repositories to be updated, set the execute bit `chmod +x gitmanage.sh`, modify the REPOSITORIES find parameters then run `./gitmanage.sh` with the parameters you choose.
# --------------------------------------------------------------------------------

# Source of parameter-handling code: http://www.freebsd.org/cgi/man.cgi?query=getopt
args=`getopt cdfghtu $*`

if [ $? -ne 0 ]; then
  echo -e "options:
  -c: check: just return what directories *would* have been updated. Supercedes all other flags
  -d: dependencies: update the package dependencies
  -f: full: remove node_modules, npm link, cake env:setup
  -g: git-fame: generate git-fame report (depends on https://github.com/oleander/git-fame-rb)
  -h: show this help menu
  -t: test: run unit tests and open results
  -u: update: update git repository"
  exit 2
fi

set -- $args

while true; do
  case "$1" in
    # TODO: Make specific cases to set boolean flags for each option
    -c|-d|-f|-g|-t|-u)
      sflags="${1#-}$sflags"
      shift
    ;;
    -h)
      echo -e "options:
      -c: check: just return what directories *would* have been updated. Supercedes all other flags
      -d: dependencies: update the package dependencies
      -f: full: remove node_modules/bower_components, npm link, cake env:setup
      -g: git-fame: generate git-fame report (depends on https://github.com/oleander/git-fame-rb)
      -t: test: run unit tests and open results
      -u: update: update git repository"
      exit 2
    ;;
    --)
      shift; break
    ;;
  esac
done

DIRECTORY_PATH="${PWD}"

declare -A STATS_LOC
declare -A STATS_COMMITS

# function runCommands determines which commands to run, based on passed-in arguments, presence of specific files, and previous Git command results
# @param string $1 - Path to Git command logfile. Will contain any errors Git encountered
# @param string $2 - Path to repository. Used to check for existance of files that determine how assets are installed and tested
function runCommands {
  # If git-fame flag (-g) enabled, run git fame (https://github.com/oleander/git-fame-rb) and save report to /reports/git-fame.csv
  # NOTE: git fame is not multi-threaded (see: https://github.com/oleander/git-fame-rb/issues/75), so running against repositories with over 300 files to parse will take a while
  # Piping through sed is to remove any quotes and thousands commas reulting from pretty printing (see: https://github.com/oleander/git-fame-rb/issues/76)
  if [[ $sflags == *["g"]* ]]; then
    "mkdir reports" > /dev/null 2>&1; touch reports/git-fame.csv; git fame --sort=loc --whitespace --everything --timeout=-1 --exclude=node_modules/*,components/*,bower_components/*,reports/*,temp/*,build/*,dist/*,vendor/*,*/vendor/* --hide-progressbar --format=csv | sed 's/\(\"\)\(.*\)\(,\)\(.*\)\(\"\)/\2\4/' > reports/git-fame.csv

    # NOTE: Requires bash 4+ (brew install bash; chsh -s /usr/local/bin/bash $USER)

    # TODO: Sum stats for users across all repositories
    while IFS=, read NAME LOC COMMITS FILES DISTRIBUTION
    do
      # Skip the first row of results (table header)
      # If LOC > 0, add contributor to results file
      if [[ ! $NAME == "name" && $LOC > 0 ]]; then
        # BUG: If a user is responsible for more than 1,000 commits or 1,000,000 lines of code, the regex to strip out commas fails, causing an invalid arithmetic operation
        STATS_LOC["${NAME/ /_}"]="$(("${STATS_LOC["${NAME/ /_}"]}" + $LOC))"
        STATS_COMMITS["${NAME/ /_}"]="$(("${STATS_COMMITS["${NAME/ /_}"]}" + $COMMITS))"
      fi
    done < reports/git-fame.csv
  fi

  # If dependencies flag (-d) enabled, update dependencies)
  if [[ $sflags == *["d"]* ]]; then
    if [ -s "${2}/package.json" ]; then
      echo "should update npm dependencies"
      # npm update --save
    fi

    if [ -s "${2}/bower.json" ]; then
      echo "should update bower dependencies"
      # bower -q  update -FSD
    fi
  fi

  # If full flag (-f) enabled, do a clean install (link, so that local linking will work without needing to re-install)
  if [[ $sflags == *["f"]* ]]; then
    if [ -s "${2}/package.json" ]; then
      rm -rf "${2}/node_modules"
      npm link -q
    fi

    if [ -s "${2}/bower.json" ]; then
      rm -rf "${2}/bower_components"
      rm -rf "${2}/components"

      bower install -sF
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
    if [ -f "$1" ]
      rm "$1"
    fi
  else
    echo -e "Command error. Check $1 for additional detail"
  fi
}

# http://stackoverflow.com/questions/8213328/bash-script-find-output-to-array
# Insert your own repository sub-folders into the multi-find statement below; ex: find $DIRECTORY_PATH/fs-components $DIRECTORY_PATH/downstream
# Modify the max- and min-depth as desired; mindepth 0 will include the directory passed in as a potential repo; maxdepth 2 will search two directories deep for potential repos
REPOSITORIES=()
while IFS= read -d $'\0' -r REPO_PATH; do
   REPOSITORIES=("${REPOSITORIES[@]}" "$REPO_PATH")
done < <(find $DIRECTORY_PATH -type d -maxdepth 1 -mindepth 0 -print0)

for i in "${!REPOSITORIES[@]}"; do
# Make sure a directory is a GitHub directory before updating
  GIT_FOLDER="$(find ${REPOSITORIES[$i]}/.git -type d -maxdepth 0 2> /dev/null)"
  if [ -z "$GIT_FOLDER" ]; then
    unset REPOSITORIES[$i]
  fi
done

if [ "${#REPOSITORIES[@]}" -gt 1 ]; then
  echo -e "${#REPOSITORIES[@]} repositories:\n"
fi

# For each repository, run additional selected commands
for REPO_PATH in "${REPOSITORIES[@]}"; do
  REPO_NAME="${REPO_PATH##*/}"

  # If check flag (-c) enabled, just print out the GitHub repositories that *would* have been updated
  if [[ $sflags == *["c"]* ]]; then
    echo -e "$REPO_NAME"
    continue
  fi

  cd $REPO_PATH
  LOGFILE="${DIRECTORY_PATH}/.${REPO_NAME}.results.txt"

  if [[ $sflags == *["u"]* ]]; then
    echo -e "Updating $REPO_NAME"

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
      # DETERMINE HOW IN THE HECK TO USE .netrc CORRECTLY TO ACCESS THE GITHUB API FOR EACH DEPENDENCY TO COMPARE THE MOST RECENT RELEASE FOR THE CURRENT REPO WITH THE CURRENT PINNED VERSION AND THEN UPDATE
      # POTENTIALLY CHECK TO SEE IF THE NEW TAG IS A NUMBER OF POSITIVE COMMITS AHEAD OF THE CURRENT PIN
      # curl -netrc-file ~/.netrc https://api.github.com/repos/fs-webdev/fs-cache/tags
      runCommands $LOGFILE $REPO_PATH
    fi
  else
    echo -e "Processing $REPO_NAME"
    runCommands $LOGFILE $REPO_PATH
  fi
done

if [[ $sflags == *["g"]* ]]; then
  # Reverse-sort contributors by LOC and save to single file
  for key in "${!STATS_LOC[@]}"; do
    printf '%s, %s, %s\n' "${key/_/ }" "${STATS_LOC[$key]}" "${STATS_COMMITS[$key]}"
  done | sort -t , -k 2nr > "${DIRECTORY_PATH}/git-combined-fame.csv"
  echo -e "Contributor,LOC,Commits\n$(cat "${DIRECTORY_PATH}/git-combined-fame.csv")" > "${DIRECTORY_PATH}/git-combined-fame.csv"

  echo -e "\nGIT FAME SUMMARY:\n"

  cat "${DIRECTORY_PATH}/git-combined-fame.csv"
fi

say "Job done--MAHSTER!"

#bash
