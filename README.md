# simple-expr
Simple expression language for [mapbox-gl-js expressions][mapbox-gl-expressions]

[![stability-experimental](https://img.shields.io/badge/stability-experimental-orange.svg)][stability]
[![Build Status](https://circleci.com/gh/orangemug/simple-expr.png?style=shield)][circleci]
[![Dependency Status](https://david-dm.org/orangemug/simple-expr.svg)][dm-prod]
[![Dev Dependency Status](https://david-dm.org/orangemug/simple-expr/dev-status.svg)][dm-dev]

[stability]:   https://github.com/orangemug/stability-badges#experimental
[circleci]:    https://circleci.com/gh/orangemug/simple-expr
[dm-prod]:     https://david-dm.org/orangemug/simple-expr
[dm-dev]:      https://david-dm.org/orangemug/simple-expr#info=devDependencies

‼️ This is an experimental repository, if you find it useful or interesting please leave a comment. There is a general discussion issue in [issue #1](https://github.com/orangemug/simple-expr/issues/1), leave any general thoughts there. Or [open a new issue](https://github.com/orangemug/simple-expr/issues/new) for bugs or to suggest new features.


The primary aim of this language is to support [MapboxGL expressions][mapbox-gl-expressions], although it should also be generally useful.

This is a tiny functional language that gets converted into [MapboxGL expressions][mapbox-gl-expressions]. The idea behind the language is that it can be converted in a lossless way between [MapboxGL expressions][mapbox-gl-expressions] and back again.


Basically it's just a nicer way to write MapboxGL expressions. Here's an example, the following JSON

```json
[
  "interpolate",
  ["linear"], ["get", "score"],
  0, ["rgb", 255, 0, 0],
  50, ["rgb", 0, 255, 0],
  100, ["rgb", 0, 0, 255]
]
```

Would be written as

```
interpolate(
  linear(), @score,
  0, rgb(255, 0, 0),
  50, rgb(0, 255, 0),
  100, rgb(0, 0, 255)
)
```

**See it in action:** <https://orangemug.github.io/simple-expr>


## Install
To install

```
npm install orangemug/simple-expr --save
```


## Syntax
You are only allowed to define a single top level expression.

**Valid**
```
rgb(255, 0, 0)
```

**Invalid!**
```
rgb(255, 0, 0)
rgb(0, 0, 255)
```

Although sub expressions are allowed

```
rgb(get("rank"), 0, 0)
```


### Types
There are 2 basic types


#### number
Any integer or decimal number not in quotes, for example

```
1
-1
+3
3.14
-1000
-9.8
```


#### string
Any characters surrounded in quotes, for example

```
"foo bar"
```

You can excape quotes with `\\` for example

```
"They said \"it couldn't be done\""
```


### Functions
Functions are defined as

```
function_name(arg, arg, arg...)
```

Note that arguments can also be functions. This gets compiled into the [MapboxGL expressions][mapbox-gl-expressions] JSON format.

Lets see an example

```
rgb(get("rating"), 0, 0)
```

Will become

```
["rgb", ["get", "rating"], 0, 0]
```


### Feature references
As well as using the `get` function ([see spec](https://www.mapbox.com/mapbox-gl-js/style-spec/#expressions-get)) there is also a shothand to reference feature data. The following

```
rgb(@rating, 0, 0)
```

Is the same as

```
rgb(get("rating"), 0, 0)
```


### Variables
**NOTE: Not yet available**

You can also define variables before the expressions. Variables are also allowed to define a single expression. A quick example

```
&r = interpolate(
  linear(), @score,
  1, 100
  22, 255
)

rgb(&r, 0, 0)
```

Variables **must** start with a `&` both in there defintion and their usage.


## Usage
You can parse, compile to json. It comes in 2 forms, the CLI (command line interface) and the javascript API


## JS API

### Compile to expression JSON
```js
var simpleExpr = require("simple-expr");
var out = simpleExpr.compiler('concat("hello", " ", "world")', {format: "json"})
assert.deepEqual(out, [
  "concat", "hello", " ", "world"
])
```

### Parse to AST

```js
var simpleExpr = require("simple-expr");
var tokens = simpleExpr.tokenizer('concat("hello", " ", "world")')
var ast = simpleExpr.parser(tokens);
assert.deepEqual(ast, {
  "type": "Program",
  "body": [
    {
      "type": "CallExpression",
      "name": "concat",
      "params": [
        {
          "type": "StringLiteral",
          "value": "hello"
        },
        {
          "type": "StringLiteral",
          "value": " "
        },
        {
          "type": "StringLiteral",
          "value": "world"
        }
      ]
    }
  ]
})
```


## CLI
The available CLI commands are

### Parse
```
simple-expr parse examples/concat.expr > /tmp/concat.ast
## >>/tmp/concat.ast
## {
##   "type": "Program",
##   "body": [
##     {
##       "type": "CallExpression",
##       "name": "concat",
##       "params": [
##         {
##           "type": "StringLiteral",
##           "value": "Hello"
##         },
##         {
##           "type": "StringLiteral",
##           "value": " "
##         },
##         {
##           "type": "FeatureRef",
##           "value": "name"
##         }
##       ]
##     }
##   ]
## }
## <<
```

### Compile
```
simple-expr compile examples/concat.expr > /tmp/concat.json
## >>/tmp/concat.json
## [
##   "concat",
##   "Hello",
##   " ",
##   [
##     "get",
##     "name"
##   ]
## ]
## <<
```

### Decompile
```
simple-expr decompile examples/concat.json > /tmp/concat.expr
## >>/tmp/concat.expr
## concat("Hello", " ", @name)
## <<
```

### Execute
```
simple-expr execute --feature-props name=Maputnik examples/concat.expr > /tmp/concat.log
## >>/tmp/concat.log
## Hello Maputnik
## <<
```


## License
[MIT](LICENSE)

[mapbox-gl-expressions]: https://www.mapbox.com/mapbox-gl-js/style-spec#expressions
