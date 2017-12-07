module.exports = function(nodes) {
  function walk(node) {
    if(node.type === "CallExpression") {
      var args = node.params.map(function(node) {
        return walk(node)
      })
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
    else if (node.type === "VarRef") {
      return ["var", node.value];
    }
  }

  if(nodes.body.length < 1) {
    return [];
  }
  else {
    return walk(nodes.body[0]);
  }

}
