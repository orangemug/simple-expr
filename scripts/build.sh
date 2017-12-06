DIR="$(dirname "$0")"

mkdir -p $DIR/../docs
cp $DIR/../site/* $DIR/../docs/
$DIR/../node_modules/.bin/browserify $DIR/../site/app.js > $DIR/../docs/app.js
$DIR/../node_modules/.bin/browserify $DIR/../site/fmt.js > $DIR/../docs/fmt.js
