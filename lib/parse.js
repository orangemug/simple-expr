module.exports = function(tokens) {
  // Cursor
  let current = 0;

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
      return out;
    }



    if(token.type === "whitespace") {
      current++
      buildNode({
        type: 'DeadCode',
        value: token.value
      }, token);
      return nodeList;
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
        name: token.value,
        params: [],
      }, token);

      if(
        tokens[current].type === 'paren' &&
        tokens[current].value !== '('
      ) {
        throw "Missing opening parenthesis";
      }

      buildNode({
        type: 'DeadCode',
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
        type: 'DeadCode',
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

  // if(ast.body.length > 1) {
  //   throw "Only allowed one top level expression";
  // }

  console.log("ast", JSON.stringify(ast, null, 2))
  return ast;
}
