module.exports = function(ast) {

  function addPosInfo(token, node) {
    if(node && node.hasOwnProperty("col") && node.hasOwnProperty("row")) {
      return Object.assign({}, token, {
        col: node.col,
        row: node.row
      });
    }
    else {
      return token;
    }
  }

  function takeTokens(tokens, defTokens) {
    tokens = tokens || [];

    const out = []
    let idx = 0;

    let skip = false;
    let defToken;
    for(defToken of defTokens) {
      if(defToken.skip) {
        continue;
      }

      let token = tokens[idx++];

      if(!token) {
        if(!defToken.optional) {
          out.push({...defToken})
        }
        continue;
      }

      if(Array.isArray(defToken)) {
        defToken = defToken.find(function(item) {
          return item.type === token.type;
        })
      }


      let typeCheck = defToken.type == token.type;

      if(!skip && typeCheck) {
        out.push(
          Object.assign({}, token, defToken)
        )
      }
      else if(defToken.optional) {
        // Skip optional nodes
        idx--;
      }
      else {
        skip = true;
        out.push({...defToken})
        // Create the rest of the tokens ourselves
      }
    }

    return out;
  }


  function buildTokens(out, node, def) {
    function pushIt(item) {
      out.push(item);
    }

    const tokens = node.tokens || {}

    takeTokens(tokens.pre,     def.pre    ).map(pushIt);
    takeTokens(tokens.current, def.current).map(pushIt);
    takeTokens(tokens.post,    def.post   ).map(pushIt);
  }

  function walk(node, parent) {
    let out = [];

    if(node.type === "ArithmeticCommand") {

      // HACK: Remove the need for this function
      function defaultObj(v) {
        if(v) {
          return v
        }
        else {
          return {};
        }
      }

      out = out.concat(
        takeTokens(defaultObj(node.params[0].tokens).pre, [
          {
            type: "whitespace",
            optional: true,
          },
          {
            type: "open_paren",
            skip: (!parent || parent.type != "ArithmeticCommand"),
            value: "("
          }
        ]),
        walk(node.params[0], node),
        takeTokens(defaultObj(node.params[0].tokens).post, [
          {
            type: "whitespace",
            optional: true,
          }
        ]),
        takeTokens(defaultObj(node.tokens).pre, [
          {
            type: "whitespace",
            optional: true,
          }
        ]),
        takeTokens(defaultObj(node.tokens).current, [
          {
            type: "arithmetic_command",
            value: node.value
          }
        ]),
        takeTokens(defaultObj(node.tokens).post, [
          {
            type: "whitespace",
            optional: true,
          }
        ]),
        takeTokens(defaultObj(node.params[1].tokens).pre, [
          {
            type: "whitespace",
            optional: true,
          }
        ]),
        walk(node.params[1], node),
        takeTokens(defaultObj(node.params[1].tokens).post, [
          {
            type: "close_paren",
            skip: (!parent || parent.type != "ArithmeticCommand"),
            value: ")"
          },
          {
            type: "whitespace",
            optional: true,
          }
        ]),
      )
    }
    else if(node.type === "CallExpression") {

      let args = []

      node.params.forEach(function(_node, idx) {
        let isLast = node.params.length-1 <= idx;

        let out = walk(_node, node)
        let noSep = (
             (out[out.length-1] && out[out.length-1].type === "arg_sep")
          || (out[out.length-2] && out[out.length-2].type === "arg_sep")
        );

        if(!isLast && !noSep) {
          out.push({type: "arg_sep"})
        }
        args = args.concat(out)
      })

      let tokens = node.tokens || {}

      out = out.concat(
        takeTokens(tokens.current, [
          {
            type: "command",
            value: node.value
          }
        ]),
        takeTokens(tokens.pre, [
          {
            type: "open_paren",
            value: "("
          },
          {
            type: "whitespace",
            optional: true,
            value: ""
          }
        ]),
        args,
        takeTokens(tokens.post, [
          {
            type: "arg_sep",
            optional: true,
            value: ","
          },
          {
            type: "close_paren",
            value: ")"
          },
          {
            type: "whitespace",
            optional: true,
            value: ""
          }
        ])
      )
    }
    else if(node.type === "FeatureRef") {
      buildTokens(out, node, {
        pre: [],
        current: [{
          type: "feature_ref",
          value: node.value
        }],
        post: [
          {
            type: "whitespace",
            optional: true,
            value: ""
          },
          {
            type: "arg_sep",
            optional: true,
            value: ","
          }
        ]
      });
    }
    else if(node.type === "StringLiteral") {
      buildTokens(out, node, {
        pre: [],
        current: [
          {
            type: "string",
            value: node.value
          }
        ],
        post: [
          {
            type: "whitespace",
            optional: true,
            value: ""
          },
          {
            type: "arg_sep",
            optional: true,
            value: ","
          },
          {
            type: "whitespace",
            optional: true,
            value: ""
          }
        ]
      });
    }
    else if(node.type === "NumberLiteral") {
      buildTokens(out, node, {
        pre: [
        ],
        current: [
          {
            type: "number",
            value: node.value
          }
        ],
        post: [
          {
            type: "whitespace",
            optional: true,
            value: ""
          },
          {
            type: "arg_sep",
            optional: true,
            value: ","
          },
          {
            type: "whitespace",
            optional: true,
            value: ""
          }
        ]
      });
    }
    else {
      throw TypeError(node.type);
    }

    return out;
  }

  if(ast.body[0]) {
    return walk(ast.body[0])
  }
  else {
    return [];
  }
}
