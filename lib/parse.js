module.exports = function(tokens) {
  // Cursor
  let current = 0;
  let lastNodeSep = true;

  function walk() {
    let nodeList = [];

    let token = tokens[current];

    function buildNode(obj, token) {
      var extra = {};
      if(token) {
        out = Object.assign({}, obj, {
          col: token.col,
          row: token.row,
        });
      }
      else {
        out = obj;
      }
      nodeList.push(out);

      // This feels really hacky
      if(["WhiteSpace"].indexOf(out.type) > -1) {
        // Ignore
      }
      else if(["CallExpression", "OpenParen", "ArgSep"].indexOf(out.type) > -1) {
        lastNodeSep = true;
      }
      else {
        lastNodeSep = false;
      }

      return out;
    }


    if(token.type === "whitespace") {
      current++
      buildNode({
        type: 'WhiteSpace',
        value: token.value
      }, token);
      return nodeList;
    }

    if(token.type === "arg_sep") {
      buildNode({
        type: 'ArgSep',
        name: token.value
      }, token);

      current++;

      return nodeList;
    }

    if(!lastNodeSep) {
      throw "Expecting argument separator";
    }

    if (token.type === 'number') {

      // If we have one, we'll increment `current`.
      current++;

      var value = token.value;

      // Work out the type
      if(token.value.match(/[.]/)) {
        value = parseFloat(value, 10);
      }
      else {
        value = parseInt(value, 10);
      }

      buildNode({
        type: 'NumberLiteral',
        value: value
      }, token);
      return nodeList;
    }

    if (token.type === 'string') {
      current++;

      buildNode({
        type: 'StringLiteral',
        value: token.value,
      }, token);
      return nodeList;
    }

    if (token.type === 'feature_ref') {
      current++;

      buildNode({
        type: 'FeatureRef',
        value: token.value,
      }, token);
      return nodeList;
    }
    if(
      token.type === 'command'
    ) {
      token = tokens[current++];

      let node = buildNode({
        type: 'CallExpression',
        value: token.value,
        params: [],
      }, token);

      if(
        tokens[current].type !== 'paren'
        || (
          tokens[current].type === 'paren' &&
          tokens[current].value !== '('
        )
      ) {
        throw "Missing opening parenthesis";
      }

      buildNode({
        type: 'OpenParen',
        name: tokens[current].value,
        params: [],
      }, token);

      // ... and skip the opening parenthesis.
      token = tokens[++current];

      while (
        token && 
        (
          (token.type !== 'paren') ||
          (token.type === 'paren' && token.value !== ')')
        )
      ) {
        // we'll call the `walk` function which will return a `node` and we'll
        // push it into our `node.params`.
        var arg = walk();
        if(arg) {
          node.params = node.params.concat(arg);
        }
        token = tokens[current];
      }

      // Check there are some closing parenthesis
      if(!token || token.type !== "paren" || token.value !== ")") {
        throw "Missing paren"
      }

      buildNode({
        type: 'CloseParen',
        name: token.value,
        params: [],
      }, token);

      // ... and skip the closing parenthesis.
      current++;

      return nodeList;
    }

    // Token not recognized
    throw new TypeError(token.type);
  }

  let ast = {
    type: 'Program',
    body: [],
  };

  while (current < tokens.length) {
    var nodes = walk()
    if(nodes) {
      ast.body = ast.body.concat(nodes);
    }
  }

  
  var ignore = ["WhiteSpace", "OpenParen", "CloseParen", "ArgSep"];
  var topLevelCount = 0;
  ast.body.forEach(function(node) {
    if(ignore.indexOf(node.type) < 0) {
      topLevelCount++;
    }
  })
  
  if(topLevelCount > 1) {
    throw "Only allowed one top level expression";
  }

  return ast;
}
