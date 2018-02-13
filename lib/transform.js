function removeUndefined(v) {
  return v !== undefined;
}

const IGNORE_NODES = [
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
    if(node.type === "CallExpression" || node.type === "ArithmeticCommand") {
      const args = node.params
        .map(walk)
        .filter(removeUndefined)

      return [node.value].concat(args);
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
    const out = nodes.body
      .map(walk)
      .filter(removeUndefined)

    if(out.length > 1) {
      throw "Invalid AST"
    }
    else if(out.length < 1) {
      return [];
    }
    else {
      return out[0];
    }
  }

}
