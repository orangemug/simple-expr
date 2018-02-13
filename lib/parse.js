const util = require("./util")
const ParseError = require("./errors").ParseError;


function fetchAdditionalTokens(cursor, types) {
  const out = [];

  // Look ahead
  let idx = 0;
  let checkType;
  while(checkType = types[idx++]) {
    let token = cursor.fetch();
    if(!token) {
      break;
    }

    let optional;
    if(checkType.match(/^(.*)(\?)$/)) {
      optional = true;
      checkType = RegExp.$1;
    }

    if(checkType == token.type) {
      out.push(token);
      cursor.move(+1)
    }
    else if(!optional) {
      throw new ParseError("Expected '"+checkType+"'", {
        token: token
      });
    }
  }

  return out;
}

function buildNode(obj, token) {
  return Object.assign({}, obj, {
    tokens: Object.assign({
      pre: [],
      post: []
    }, obj.tokens, {
      // Always override...
      current: [
        token
      ]
    })
  });
}

const parsers = {
  "open_paren": function(cursor) {
    throw new ParseError("Incorrectly placed open_paren", {
      token: cursor.fetch()
    });
  },
  "close_paren": function(cursor) {
    throw new ParseError("Incorrectly placed close_paren", {
      token: cursor.fetch()
    });
  },
  "whitespace": function(cursor) {
    cursor.move(+1);
    return;
  },
  "arg_sep": function(cursor) {
    throw new ParseError("Misplaced arg_sep", {
      token: cursor.fetch()
    });
  },
  "number": function(cursor) {
    const token = cursor.fetch();
    cursor.move(+1);

    const node = buildNode({
      type: 'NumberLiteral',
      tokens: {
        post: fetchAdditionalTokens(cursor, ["whitespace?", "arg_sep?", "whitespace?"])
      },
      value: util.parseNumber(token.value)
    }, token);

    return node;
  },
  "string": function(cursor) {
    let token = cursor.fetch();
    cursor.move(+1);

    const node = buildNode({
      type: 'StringLiteral',
      tokens: {
        post: fetchAdditionalTokens(cursor, ["whitespace?", "arg_sep?", "whitespace?"])
      },
      value: token.value
    }, token);

    return node;
  },
  "feature_ref": function(cursor) {
    let token = cursor.fetch();
    cursor.move(+1);

    const node = buildNode({
      type: 'FeatureRef',
      tokens: {
        post: fetchAdditionalTokens(cursor, ["whitespace?", "arg_sep?", "whitespace?"])
      },
      value: token.value,
    }, token);

    return node;
  },
  "command": function(cursor) {
    let token = cursor.fetch();
    cursor.move(+1);

    let node = buildNode({
      type: 'CallExpression',
      value: token.value,
      tokens: {
        pre: fetchAdditionalTokens(cursor, ["open_paren", "whitespace?"])
      },
      params: [],
    }, token);

    let argSepRequired = false;
    while (
      (token = cursor.fetch())
      && (
        (token.type !== 'close_paren')
      )
    ) {
      // we'll call the `walk` function which will return a `node` and we'll
      // push it into our `node.params`.
      const arg = parsers[token.type](cursor);

      if(arg) {
        if(!cursor.fetch()) {
          throw new ParseError("Missing close_paren", {
            token: token
          })
        }
        else if(cursor.fetch().type !== "close_paren") {
          let argSep = arg.tokens.post
            .find(function(item) {
              return item.type === "arg_sep";
            })

          if(!argSep) {
            throw new ParseError("Missing arg_sep", {
              token: token
            });
          }
        }
        node.params = node.params.concat(arg);
      }

      // Check we found a arg_sep

      argSepRequired = true;
    }

    node.tokens.post = fetchAdditionalTokens(cursor, ["close_paren", "arg_sep?", "whitespace?"]);
    return node;
  }
}

function Cursor(tokens, idx = 0) {
  this._tokens = tokens;
  this._idx    = idx;
}

Cursor.prototype.move = function(offset) {
  this._idx += offset;
}

Cursor.prototype.currentIndex = function() {
  return this._idx;
}

Cursor.prototype.fetch = function() {
  return this.peek(0);
}

Cursor.prototype.peek = function(offset) {
  return this._tokens[this._idx+offset];
}

Cursor.prototype.atEnd = function() {
  return this._idx > this._tokens.length-1;
}

function parse(tokens) {
  const cursor = new Cursor(tokens);
  let ast = [];

  while(!cursor.atEnd()) {
    const token = cursor.fetch();
    let nodes = parsers[token.type](cursor);

    if(nodes) {
      ast = ast.concat(nodes);
    }
  }

  if(ast.length > 1) {
    throw new ParseError("Multiple top level functions not allowed", {
      token: token
    })
  }

  return {
    type: 'Program',
    body: ast
  };
}

module.exports = parse;
