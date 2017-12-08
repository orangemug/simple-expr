var sourceMap = require("source-map");


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
  compile: require("./lib/compile"),
  decompile: require("./lib/decompile"),
  // Compile steps
  tokenize: require("./lib/tokenize"),
  parse: require("./lib/parse"),
  transform: require("./lib/transform"),
  // Decompile steps
  untransform: require("./lib/untransform"),
  unparse: require("./lib/unparse"),
  untokenize: require("./lib/untokenize"),
  // Deprecated APIs
  decompileFromAst,
};

