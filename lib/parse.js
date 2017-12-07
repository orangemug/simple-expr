module.exports = function(tokens) {
  // Cursor
  let current = 0;

  function buildNode(obj, token) {
    var extra = {};
    if(token) {
      return Object.assign({}, obj, {
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
    let prevToken = tokens[current-1];

    var prevIsSep = (
      !prevToken
      || prevToken.type === "arg_sep"
      || prevToken.type === "paren"
    )

    if(token.type === "arg_sep") {
      token = tokens[++current];
    }
    else if(!prevIsSep) {
      // Any argument **must** pre proceeded with a separtor
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

    if (token.type === 'var_ref') {
      current++;

      return buildNode({
        type: 'VarRef',
        value: token.value,
      }, token);
    }

    if(
      token.type === 'name'
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
        node.params.push(walk());
        token = tokens[current];
      }

      // Check there are some closing parenthesis
      if(!token || token.type !== "paren" || token.value !== ")") {
        throw "Missing paren"
      }
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
    ast.body.push(walk());
  }

  if(ast.body.length > 1) {
    throw "Only allowed one top level expression";
  }

  return ast;
}
