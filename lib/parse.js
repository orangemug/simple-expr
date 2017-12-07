module.exports = function(tokens) {
  // Cursor
  let current = 0;

  function buildNode(obj, token) {
    var extra = {};
    if(token) {
      return Object.assign({}, obj, {
        pre: [],
        post: [],
        col: token.col,
        row: token.row,
      });
    }
    else {
      return obj;
    }
  }

  function walk() {

    let token = tokens[current];


    if(token.type === "whitespace") {
      current++
      return;
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

      return buildNode({
        type: 'NumberLiteral',
        value: value
      }, token);
    }

    if (token.type === 'string') {
      current++;

      return buildNode({
        type: 'StringLiteral',
        value: token.value,
      }, token);
    }

    if (token.type === 'feature_ref') {
      current++;

      return buildNode({
        type: 'FeatureRef',
        value: token.value,
      }, token);
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

      node.pre.push(token);

      if(
        tokens[current].type === 'paren' &&
        tokens[current].value !== '('
      ) {
        throw "Missing opening parenthesis";
      }

      node.pre.push(tokens[current]);

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
          node.params.push(arg);
        }
        token = tokens[current];
      }

      // Check there are some closing parenthesis
      if(!token || token.type !== "paren" || token.value !== ")") {
        throw "Missing paren"
      }

      node.post.push(token);

      // ... and skip the closing parenthesis.
      current++;

      return node;
    }

    // Token not recognized
    throw new TypeError(token.type);
  }

  let ast = buildNode({
    type: 'Program',
    body: [],
  });

  while (current < tokens.length) {
    var node = walk()
    if(node) {
      ast.body.push(node);
    }
  }

  if(ast.body.length > 1) {
    throw "Only allowed one top level expression";
  }

  console.log("ast", JSON.stringify(ast, null, 2))
  return ast;
}
