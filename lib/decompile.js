var untransform = require("./untransform");
var unparse     = require("./unparse");
var untokenize  = require("./untokenize");


module.exports = function(mglJSON) {
  var ast = untransform(mglJSON);
  var tokens = unparse(ast);
  var code = untokenize(tokens);
  return code;
}
