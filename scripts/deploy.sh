#!/bin/bash
set -e
set -o pipefail
set -x

cd googleSearchAdapter && serverless deploy && cd ..
truffle migrate --network kovaninfura
npm run build-frontend
rsync -r --delete-after $TRAVIS_BUILD_DIR/dist travis-ci@jaspa.codes:/var/www/crypto-seo
