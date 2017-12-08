module.exports = function untransform(node) {
  function walk(node, depth) {
    depth = depth || 0;

    if(node.length < 1) {
      if(depth > 0) {
        throw "node requires function name";
      }
      else {
        // Empty expression
        return "";
      }
    }

    var command = node[0];
    var args = node.slice(1);

    if(command == "get") {
      if(node.length !== 2) {
        throw "'get' has too many params";
      }
      return {
        type: "FeatureRef",
        value: node[1]
      }
    }
    else {
      var args = args.map(function(childNode) {
        if(Array.isArray(childNode)) {
          return walk(childNode, depth+1)
        }
        else if(typeof(childNode) === "number") {
          return {
            type: "NumberLiteral", 
            value: childNode
          }
        }
        else {
          return {
            type: "StringLiteral", 
            value: childNode
          }
        }
      })

      return {
        type: "CallExpression",
        value: command,
        params: args
      }
    }
  }

  return {
    "type": "Program",
    "body": [
      walk(node)
    ]
  }
}
