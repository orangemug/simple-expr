module.exports = function(tokens) {

  function walk(node) {
    var type = node.type;

    if(type === "feature_ref") {
      return "@"+node.value
    }
    else if(type === "command") {
      return node.value
    }
    else if(type === "string") {
      return "\""+node.value+"\"";
    }
    else if(type === "paren") {
      return node.value;
    }
    else if(type === "number") {
      return node.value;
    }
    else if(type === "arg_sep") {
      return ",";
    }
    else if(type === "whitespace") {
      return node.value;
    }
    else {
      throw "Unrecognised node type '"+type+"'"
    }
  }

  return tokens.map(walk).join("");
}
