const sourceMap = require("source-map");


module.exports = function(tokens) {

  function walk(node) {
    const type = node.type;

    if(type === "feature_ref") {
      return "@"+node.value
    }
    else if(type === "command") {
      return node.value
    }
    else if(type === "string") {
      return "\""+node.value+"\"";
    }
    else if(type === "open_paren") {
      return node.value;
    }
    else if(type === "close_paren") {
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


  let map = new sourceMap.SourceMapGenerator({});
  let genCol = 0;
  let genRow = 0;

  function genMapping(token) {
    if(token.hasOwnProperty("row") || token.hasOwnProperty("col")) {
      const mapData = {
        generated: {
          line: genRow+1,
          column: genCol
        },
        source: "foo.js",
        original: {
          line: token.row+1,
          column: token.col
        },
        name: "foo"
      };
      map.addMapping(mapData);
    }
  }

  const rslt = tokens.map(function(token) {
    genMapping(token);
    const out = String(walk(token));
    genCol += out.length;
    return out;
  }).join("");

  return {
    code: rslt,
    map: map.toJSON()
  }
}
