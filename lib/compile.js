var tokenize  = require("./tokenize");
var parse     = require("./parse");
var transform = require("./transform");


module.exports = function(code) {
  var tokens = tokenize(code);
  var ast = parse(tokens);
  var mglJSON = transform(ast);
  return mglJSON;
}
