#!/bin/bash
set -e
set -o pipefail
set -x

cd googleSearchAdapter
npm install 
serverless deploy
export SEARCH_URL=`serverless info | grep 'GET -' | sed 's/GET -//g' | xargs`
cd ..

npx truffle migrate --network kovaninfura
npm run build-frontend
rsync -r --delete-after $TRAVIS_BUILD_DIR/dist travis-ci@jaspa.codes:/var/www/crypto-seo
