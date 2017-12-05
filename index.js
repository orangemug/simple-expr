

function tokenizer(input) {
  let current = 0;

  let tokens = [];

  while (current < input.length) {
    let char = input[current];

    if (char === '(') {
      tokens.push({
        type: 'paren',
        value: '(',
      });
      current++;
      continue;
    }
    if (char === ')') {
      tokens.push({
        type: 'paren',
        value: ')',
      });
      current++;
      continue;
    }
    if(char === ",") {
      tokens.push({
        type: 'arg_sep'
      });
      current++;
      continue;
    }

    // Whitespace is insignificant
    let WHITESPACE = /\s/;
    if (WHITESPACE.test(char)) {
      current++;
      continue;
    }

		// TODO: Check commas here...

    let NUMBERS = /[-+.0-9]/;
    if (NUMBERS.test(char)) {

      // We're going to create a `value` string that we are going to push
      // characters to.
      let value = '';

      // Then we're going to loop through each character in the sequence until
      // we encounter a character that is not a number, pushing each character
      // that is a number to our `value` and incrementing `current` as we go.
      while (NUMBERS.test(char)) {
        value += char;
        char = input[++current];
      }

      if(!value.match(/^[+-]?([0-9]*\.)?[0-9]+$/)) {
        throw "Invalid number '"+value+"'"
      }

      // After that we push our `number` token to the `tokens` array.
      tokens.push({ type: 'number', value });

      // And we continue on.
      continue;
    }

    // // Comment
		// if (char === '/' && input[current+1] == "*") {
    //   // Keep a `value` variable for building up our string token.
    //   let value = '';

    //   // We'll skip the opening double quote in our token.
    //   char = input[current+=2];

    //   // Then we'll iterate through each character until we reach another
    //   // double quote.
    //   while (!(char == "*" && input[current+1] == "/")) {
    //     value += char;
    //     char = input[++current];
    //   }

    //   // Skip the closing double quote.
    //   char = input[current+=2];

    //   // And add our `string` token to the `tokens` array.
    //   tokens.push({ type: 'comment', value });

    //   continue;
		// }

    // Feature reference
		if (char === '&') {
      // Keep a `value` variable for building up our string token.
      let value = '';

      // We'll skip the opening double quote in our token.
      char = input[++current];

      // Then we'll iterate through each character until we reach another
      // double quote.
      while (char.match(/[a-zA-Z0-9_]/)) {
        value += char;
        char = input[++current];
      }

      // Skip the closing double quote.
      char = input[++current];

      // And add our `string` token to the `tokens` array.
      tokens.push({ type: 'var_ref', value });

      continue;
		}

    // Feature reference
		if (char === '@') {
      // Keep a `value` variable for building up our string token.
      let value = '';

      // We'll skip the opening double quote in our token.
      char = input[++current];

      // Then we'll iterate through each character until we reach another
      // double quote.
      while (char.match(/[a-zA-Z0-9_]/)) {
        value += char;
        char = input[++current];
      }

      // And add our `string` token to the `tokens` array.
      tokens.push({ type: 'feature_ref', value });

      continue;
		}

		if (char === '"') {
      // Keep a `value` variable for building up our string token.
      let value = '';

      // We'll skip the opening double quote in our token.
      char = input[++current];

      // Then we'll iterate through each character until we reach another
      // double quote.
      var prev;
      while (prev === "\\" || char !== '"') {
        value += char;
        prev = char;
        char = input[++current];
        if(char === undefined) {
          throw "Missing closing quote";
        }
      }

      // Skip the closing double quote.
      char = input[++current];

      // And add our `string` token to the `tokens` array.
      tokens.push({ type: 'string', value });

      continue;
		}


    let LETTERS = /[^)( \t]/i;
    if (LETTERS.test(char)) {
      let value = '';

			// This allows for log10 method name but not 10log
      while (char && LETTERS.test(char)) {
        value += char;
        char = input[++current];
      }

      // And pushing that value as a token with the type `name` and continuing.
      tokens.push({ type: 'name', value });

      continue;
		}

    // Finally if we have not matched a character by now, we're going to throw
    // an error and completely exit.
    throw new TypeError('I dont know what this character is: ' + char);
  }

	return tokens;
}

function parser(tokens, depth) {
  depth = depth || 0;

  // Again we keep a `current` variable that we will use as a cursor.
  let current = 0;

  // But this time we're going to use recursion instead of a `while` loop. So we
  // define a `walk` function.
  function walk() {

    // Inside the walk function we start by grabbing the `current` token.
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
      throw "Expecting argument separator";
    }



    // We're going to split each type of token off into a different code path,
    // starting off with `number` tokens.
    //
    // We test to see if we have a `number` token.
    if (token.type === 'number') {

      // If we have one, we'll increment `current`.
      current++;

      // And we'll return a new AST node called `NumberLiteral` and setting its
      // value to the value of our token.
      var value = token.value;
      if(token.value.match(/[.]/)) {
        value = parseFloat(value, 10);
      }
      else {
        value = parseInt(value, 10);
      }

      return {
        type: 'NumberLiteral',
        value: value
      };
    }

    // If we have a string we will do the same as number and create a
    // `StringLiteral` node.
    if (token.type === 'string') {
      current++;

      return {
        type: 'StringLiteral',
        value: token.value,
      };
    }

    if (token.type === 'feature_ref') {
      current++;

      return {
        type: 'FeatureRef',
        value: token.value,
      };
    }

    if (token.type === 'var_ref') {
      current++;

      return {
        type: 'VarRef',
        value: token.value,
      };
    }

    // Next we're going to look for CallExpressions. We start this off when we
    // encounter an open parenthesis.

    if(
      token.type === 'name'
    ) {
      // We'll increment `current` to skip the parenthesis since we don't care
      // about it in our AST.
      token = tokens[current++];

      // We create a base node with the type `CallExpression`, and we're going
      // to set the name as the current token's value since the next token after
      // the open parenthesis is the name of the function.
      let node = {
        type: 'CallExpression',
        name: token.value,
        params: [],
      };

      if(
        tokens[current].type === 'paren' &&
        tokens[current].value !== '('
      ) {
        throw "Arrrgh";
      }

      // We increment `current` *again* to skip the name token.
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


      if(!token || token.type !== "paren") {
        throw "Missing paren"
      }

      // Skip the closing parenthesis.
      current++;

      // And return the node.
      return node;
    }

    // Again, if we haven't recognized the token type by now we're going to
    // throw an error.
    throw new TypeError(token.type);
  }

  // Now, we're going to create our AST which will have a root which is a
  // `Program` node.
  let ast = {
    type: 'Program',
    body: [],
  };

  while (current < tokens.length) {
    ast.body.push(walk());
  }

  if(depth === 0 && ast.body.length > 1) {
    throw "Only allowed one top level expression";
  }

  // At the end of our parser we'll return the AST.
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

function compiler(input) {
  let tokens = tokenizer(input);
  let ast    = parser(tokens);
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
      throw "Foobar"
    }

    return out;
  }

  return nodes.body.map(function(node) {
    return walk(node);
  }).join("")
}


module.exports = {
  tokenizer,
  parser,
  transformer,
  compiler,
  codeGenerator
};

