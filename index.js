var sourceMap = require("source-map");


/**
 * This parser was built from <https://github.com/thejameskyle/the-super-tiny-compiler>
 */

function tokenizer(input) {
  let current = 0;

  let tokens = [];

  let row = 0;
  let offset = 0;

  function addToken(obj) {
    var token = Object.assign({}, obj, {
      row: row,
      col: (current) - offset
    })
    tokens.push(token)
    return token;
  }

  while (current < input.length) {
    let char = input[current];

    if(char === "\n") {
      row += 1;
      offset = current + 1/*Including the '\n' */;
    }

    if (char === '(') {
      addToken({
        type: 'paren',
        value: '(',
      });
      current++;
      continue;
    }
    if (char === ')') {
      addToken({
        type: 'paren',
        value: ')',
      });
      current++;
      continue;
    }
    if(char === ",") {
      addToken({
        type: 'arg_sep'
      });
      current++;
      continue;
    }

    // Whitespace is ignored
    // Note: whitespace in strings are handled separately in the string handler
    let WHITESPACE = /\s/;
    if (WHITESPACE.test(char)) {
      current++;
      continue;
    }

    let NUMBERS = /[-+.0-9]/;
    if (NUMBERS.test(char)) {
      let value = '';

      var token = addToken({type: 'number'});

      while (NUMBERS.test(char)) {
        value += char;
        char = input[++current];
      }

      token.value = value;

      if(!value.match(/^[+-]?([0-9]*\.)?[0-9]+$/)) {
        throw "Invalid number '"+value+"'"
      }

      continue;
    }

    // Variable
		if (char === '&') {
      let value = '';

      var token = addToken({ type: 'var_ref'});

      // Skip the '&'
      char = input[++current];

      while (char.match(/[a-zA-Z0-9_]/)) {
        value += char;
        char = input[++current];
      }

      token.value = value;

      continue;
		}

    // Feature reference
		if (char === '@') {
      let value = '';

      var token = addToken({ type: 'feature_ref'});

      // Skip the '@'
      char = input[++current];

      while (char.match(/[a-zA-Z0-9_]/)) {
        value += char;
        char = input[++current];
      }

      token.value = value;

      continue;
		}

		if (char === '"') {
      // Keep a `value` variable for building up our string token.
      let value = '';

      var token = addToken({ type: 'string'});

      // We'll skip the opening double quote in our token.
      char = input[++current];

      // Iterate through each character until we reach another double quote.
      var prev;
      while (prev === "\\" || char !== '"') {
        value += char;
        prev = char;
        char = input[++current];
        if(char === undefined) {
          throw "Missing closing quote";
        }
      }

      token.value = value;

      if(char !== "\"") {
        throw "Missing closing quote"
      }

      // Skip the closing double quote.
      char = input[++current];

      continue;
		}


    let LETTERS = /[^)( \t]/i;
    if (LETTERS.test(char)) {
      let value = '';

      var token = addToken({ type: 'name'});

			// This allows for log10 method name but not 10log
      while (char && LETTERS.test(char)) {
        value += char;
        char = input[++current];
      }

      token.value = value;

      continue;
		}

    throw new TypeError('I don\'t know what this character is: ' + char);
  }

	return tokens;
}

function parser(tokens, depth) {
  depth = depth || 0;

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

  if(depth === 0 && ast.body.length > 1) {
    throw "Only allowed one top level expression";
  }

  return ast;
}

function transformer(nodes) {
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

function log(label, obj) {
  console.log(label, JSON.stringify(obj, null, 2));
}

function compiler(input) {
  let tokens = tokenizer(input);
  log("tokens", tokens);
  let ast    = parser(tokens);
  log("ast", ast);
  let output = transformer(ast);

  return output;
}

function codeGenerator(nodes) {
  function walk(node) {
    var out;

    if(node.type === "CallExpression") {
      var args = node.params.map(function(node) {
        return walk(node)
      }).join(",");

      out = node.name+"("+args+")";
    }
    else if (node.type === "StringLiteral") {
      out = JSON.stringify(node.value);
    }
    else if (node.type === "NumberLiteral") {
      out = JSON.stringify(node.value);
    }
    else if (node.type === "FeatureRef") {
      out = "@"+node.value;
    }
    else if (node.type === "VarRef") {
      out = "&"+node.value;
    }
    else {
      throw "Invalid node "+JSON.stringify(node);
    }

    return out;
  }

  return nodes.body.map(function(node) {
    return walk(node);
  }).join("")
}


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
  tokenizer,
  parser,
  transformer,
  compiler,
  decompile,
  codeGenerator,
  decompileFromAst,
  codeGenerator
};

