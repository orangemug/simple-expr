var sourceMap = require("source-map");


/**
 * This is a bit messy at the moment and should parse back to the AST
 */
function decompile(node, depth) {
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
    return "@"+node[1]
  }
  else {
    var argsStr = args.map(function(childNode) {
      if(Array.isArray(childNode)) {
        return decompile(childNode)
      }
      else if(typeof(childNode) === "number") {
        return childNode
      }
      else {
        return "\""+childNode+"\"";
      }
    })
    .join(", ")

    return command+"("+argsStr+")"
  }
}

function decompileFromAst(node) {
  var map = new sourceMap.SourceMapGenerator({});

  function genMapping(name, opts) {
    map.addMapping({
      generated: {
        line: opts.generated.line,
        column: opts.generated.column
      },
      source: "foo.js",
      original: {
        line: opts.original.line,
        column: opts.original.column
      },
      name: "foo"
    });
  }

  var outStr = "";

  function go(node, depth) {
    depth = depth || 0;

    if(node.type === "CallExpression") {
      genMapping(node.type, {
        original: {
          line: node.row+1,
          column: node.col
        },
        generated: {line: 1, column: outStr.length}
      })
      outStr = outStr + `${node.name}(`;
      node.params.forEach(function(_node, idx) {
        go(_node, depth)
        if(idx < node.params.length -1) {
          outStr += ", "
        }
      })

      outStr = outStr + `)`;
    }
    else if(node.type === "NumberLiteral") {
      genMapping(node.type, {
        original: {
          line: node.row+1,
          column: node.col
        },
        generated: {line: 1, column: outStr.length}
      })
      outStr = outStr + node.value;
    }
    else if(node.type === "StringLiteral") {
      genMapping(node.type, {
        original: {
          line: node.row+1,
          column: node.col
        },
        generated: {line: 1, column: outStr.length}
      })
      outStr = outStr + JSON.stringify(node.value);
    }
    else if(node.type === "FeatureRef") {
      genMapping(node.type, {
        original: {
          line: node.row+1,
          column: node.col
        },
        generated: {line: 1, column: outStr.length}
      })
      outStr = outStr + "@"+node.value;
    }

  }

  genMapping(node.type, {
    original: {line: 1, column: 0},
    generated: {line: 1, column: 0}
  })

  go(node.body[0])
  return {
    code: outStr,
    map: map.toJSON()
  };
}

module.exports = {
  tokenizer: require("./lib/tokenize"),
  parser: require("./lib/parse"),
  transformer: require("./lib/transform"),
  compiler: require("./lib/compile"),
  decompile,
  decompileFromAst,
};

