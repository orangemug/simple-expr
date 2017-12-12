const untransform = require("./untransform");
const unparse     = require("./unparse");
const untokenize  = require("./untokenize");


module.exports = function(mglJSON) {
  const ast = untransform(mglJSON);
  const tokens = unparse(ast);
  const rslt = untokenize(tokens);
  return rslt.code;
}
