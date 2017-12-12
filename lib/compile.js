const tokenize  = require("./tokenize");
const parse     = require("./parse");
const transform = require("./transform");


module.exports = function(code) {
  const tokens = tokenize(code);
  const ast = parse(tokens);
  const mglJSON = transform(ast);
  return mglJSON;
}
