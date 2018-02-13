module.exports = function(source) {
  let current = 0;

  let tokens = [];

  let row = 0;
  let offset = 0;

  function addToken(obj) {
    const token = Object.assign({}, obj, {
      row: row,
      col: (current) - offset
    })
    tokens.push(token)
    return token;
  }

  while (current < source.length) {
    let char = source[current];

    const arithmeticChars = [
      "-",
      "*",
      "/",
      "%",
      "^",
      "+"
    ]

    if(arithmeticChars.indexOf(char) > -1 && source[current+1] == " ") {
      addToken({
        type: "arithmetic_command",
        value: char
      })
      current++;
      continue;
    }

    if(char === "\n") {
      addToken({
        type: 'whitespace',
        value: '\n',
      });
      row += 1;
      offset = current + 1/*Including the '\n' */;
      current++
      continue;
    }

    if (char === '(') {
      addToken({
        type: 'open_paren',
        value: '(',
      });
      current++;
      continue;
    }
    if (char === ')') {
      addToken({
        type: 'close_paren',
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
      let value = "";
      let token = addToken({
        type: "whitespace"
      })

      while (WHITESPACE.test(char)) {
        value += char;
        char = source[++current];
      }

      token.value = value;
      continue;
    }

    let NUMBERS = /[-+.0-9]/;
    if (NUMBERS.test(char)) {
      let value = '';

      const token = addToken({type: 'number'});

      while (NUMBERS.test(char)) {
        value += char;
        char = source[++current];
      }

      token.value = value;

      if(!value.match(/^[+-]?([0-9]*\.)?[0-9]+$/)) {
        throw "Invalid number '"+value+"'"
      }

      continue;
    }

    // Feature reference
		if (char === '@') {
      let value = '';

      const token = addToken({ type: 'feature_ref'});

      // Skip the '@'
      char = source[++current];

      while (char.match(/[a-zA-Z0-9_]/)) {
        value += char;
        char = source[++current];
      }

      token.value = value;

      continue;
		}

		if (char === '"') {
      // Keep a `value` variable for building up our string token.
      let value = '';

      const token = addToken({ type: 'string'});

      // We'll skip the opening double quote in our token.
      char = source[++current];

      // Iterate through each character until we reach another double quote.
      let prev;
      while (prev === "\\" || char !== '"') {
        value += char;
        prev = char;
        char = source[++current];
        if(char === undefined) {
          throw "Missing closing quote";
        }
      }

      token.value = value;

      if(char !== "\"") {
        throw "Missing closing quote"
      }

      // Skip the closing double quote.
      char = source[++current];

      continue;
		}


    let LETTERS = /[^)( \t]/i;
    if (LETTERS.test(char)) {
      let value = '';

      let token = addToken({ type: 'command'});

			// This allows for log10 method name but not 10log
      while (char && LETTERS.test(char)) {
        value += char;
        char = source[++current];
      }

      token.value = value;

      continue;
		}

    throw new TypeError('I don\'t know what this character is: ' + char);
  }

  // Always trailing whitespace so the source maps can map to it.
  // TODO: Is this needed?
  addToken({
    type: 'whitespace',
    value: '\n',
  });

	return tokens;
}
