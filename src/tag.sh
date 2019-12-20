#!/bin/bash
set -eu

git_setup() {
  cat <<- EOF > $HOME/.netrc
        machine github.com
        login $GITHUB_ACTOR
        password $GITHUB_TOKEN
        machine api.github.com
        login $GITHUB_ACTOR
        password $GITHUB_TOKEN
EOF
    chmod 600 $HOME/.netrc

    git config --global user.email "actions@github.com"
    git config --global user.name "Short Tag Action"
}

git_setup

echo "Tagging commit..."
git tag --force -a "v$PARAM_MAJOR" -m "Link to version $PARAM_MATCH"

if $PARAM_PUSH
then
  echo "Pushing to repo..."
  git push --tags --force"
else
  echo "Not pushing to repo."
fi
