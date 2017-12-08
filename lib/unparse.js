module.exports = function(ast) {

  function addPosInfo(token, node) {
    if(node && node.hasOwnProperty("col") && node.hasOwnProperty("row")) {
      return Object.assign({}, token, {
        col: node.col,
        row: node.row
      });
    }
    else {
      return token;
    }
  }

  function walk(node, prevNode) {
    var out = [];
    // Check previous node and add whitespace, etc...
    if(prevNode && prevNode.type.match(/CallExpression|FeatureRef|StringLiteral|NumberLiteral/)) {
      if(prevNode.type !== "ArgSep") {
        out.push(addPosInfo({
          type: "arg_sep",
          value: ","
        }))
        out.push(addPosInfo({
          type: "whitespace",
          value: " "
        }))
      }
    }


    if(node.type === "CallExpression") {
      var parts = [
        addPosInfo({
          type: "command",
          value: node.value
        }, node),
        addPosInfo({
          type: "paren",
          value: "("
        })
      ]

      var prevArgNode;
      node.params.forEach(function(_node) {
        parts = parts.concat(
          walk(_node, prevArgNode)
        )
        prevArgNode = _node;
      })

      parts.push(
        addPosInfo({
          type: "paren",
          value: ")"
        })
      )

      out = out.concat(parts);
    }
    else if(node.type === "FeatureRef") {
      out.push(addPosInfo({
        type: "feature_ref",
        value: node.value
      }, node));
    }
    else if(node.type === "StringLiteral") {
      out.push(addPosInfo({
        type: "string",
        value: node.value
      }, node))
    }
    else if(node.type === "NumberLiteral") {
      out.push(addPosInfo({
        type: "number",
        value: node.value
      }, node))
    }
    else if(node.type === "ArgSep") {
      // skip
      return
    }

    return out;
  }

  var out = walk(ast.body[0])
  return out;
}
