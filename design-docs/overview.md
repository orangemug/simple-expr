# Design
The compiler has the following stages

 1. tokenize - code -> tokens
 2. parse - tokens -> ast
 3. transform - ast -> mgl-expressions

From mgl-expressions you can also go back the other direction

 1. untransform - mgl-expressions -> ast
 2. unparse - ast -> tokens
 3. untokenize - tokens -> code

These are grouped into

 - compile (tokenize -> parse -> transform)
 - decompile (untransform -> unparse -> untokenize)


## Source maps
Note that untokenize will produce a sourcemap if location information is available in the AST.

This includes any additionally stored tokens in the AST.

If we provide the options `{keepTokens: true}` to the parser will attach the tokens to each node also. So it'll look something like this

```
{
  type: "string",
  tokens: [
    {type: "quote", value: "\"", col: 0, line: 0},
    {type: "string", value: "Hello", col: 1, line: 1},
    {type: "quote", value: "\"", col: 6, line: 1}
  ]
}
```

With this additional information the _unparser_ can persist location information for all the tokens, including collapsed whitespace, quotes and parens.

This means that if we have a cursor position some source code we can, run

```
tokenizer -> parser -> unparser -> untokenizer
```

Retaining the original cursor position in the text by mapping the original position to the generated code.

Note that this is also the process of the `tinyexpr fmt` command.

