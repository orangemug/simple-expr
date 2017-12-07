function removeFalsey(v) {
  return !!v;
}

var IGNORE_NODES = [
  "OpenParen",
  "CloseParen",
  "WhiteSpace"
]

module.exports = function(nodes) {
  function walk(node) {
    if(
      IGNORE_NODES.indexOf(node.type) > -1
    ) {
      // Ignoring node.
      return;
    }
    if(node.type === "CallExpression") {
      var args = node.params
        .map(walk)
        .filter(removeFalsey)

      return [node.name].concat(args);
    }
    else if (node.type === "StringLiteral") {
      return node.value;
    }
    else if (node.type === "NumberLiteral") {
      return node.value;
    }
    else if (node.type === "FeatureRef") {
      return ["get", node.value];
    }
  }

  if(nodes.body.length < 1) {
    return [];
  }
  else {
    var out = nodes.body
      .map(walk)
      .filter(removeFalsey)
    return out[0];
  }

}
