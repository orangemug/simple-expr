# simple-expr
A expression grammer.

[![stability-unstable](https://img.shields.io/badge/stability-unstable-yellow.svg)][stability]
[![Build Status](https://circleci.com/gh/orangemug/simple-expr.png?style=shield)][circleci]

[stability]:   https://github.com/orangemug/stability-badges#unstable
[circleci]:    https://circleci.com/gh/orangemug/simple-expr


The primary aim is the for the [mapbox-gl style spec expressions](https://www.mapbox.com/mapbox-gl-js/style-spec#expressions).


## Install
To install

```
npm install orangemug/simple-expr --save
```


## Syntax
You can have any number of `let` statements at the start of your expression. Let statements assign a value to a variable. You can reference these variables with a `&` prefix. For example `&foo`.

Any data passed in to the exprssion will be available prefixed with `@`. For example `{rank: 1}` would be available as `@rank` in the expression.

The functions come straight from the mapbox gl spec. A full example would be

```
&foo = "Hello"
&bar = "World"

concat(&foo, " ", &bar)
```

Defining constants after the expression is not allowed, but is allowed inside sub-expressions.

```
&foo = "Hello";
&bar = "World";

concat(&foo, {
  &bar = "Mary";

  return &bar
})
```

Sub-expressions are here so we can support the spec properly and there use is discouraged.

Note that you can call arithmatic in one of 2 ways

```
return +(1, 2)
```

Or the prefered way 

```
return 1 + 2
```

Arithmatic expression is not supported and will throw an error. For example

```
return 3 + 2 * @rank
```

Would need to become either `3 + (2 * @rank)` or `(3 + 2) * @rank`.

The same applies to conditionals

```
return @rank == 1 == @name
```

Would need to become either `(@rank == 1) == @name` or `(@rank == (1 == @name))`





## Usage
You can parse, compile to json and even run it as javascript. It comes in 2 forms, the CLI (command line interface) and the javascript API

## JS API

```
import simpleExpr from 'simple-expr';

out = simpleExpr.parse('concat("hello", " ", "world")')
assert.equal(out, {
  {
    type: "function",
    name: "concat",
    args: [
      {type: "string", value: "hello"},
      {type: "string", value: " "},
      {type: "string", value: "world"}
    ]
  }
})

out = simpleExpr.compile('concat("hello", " ", "world")', {format: "json"})
assert.equal(out, [
  "concat", "hello", " ", "world"
])

out = simpleExpr.compile('concat("hello", " ", "world")', {format: "js"})
assert.equal(out, "function concat() {Array.prototype.slice.call(arguments, 0).join("")}; function() {concat("Hello", " ", "world")}")

out = simpleExpr.exec('concat("hello", " ", get("name"))', {
  /* data... */
  name: "Mary"
})
assert.equal(out, "Hello Mary")
```


## CLI

```
$ maputnik-expr parse input.expr
$ maputnik-expr compile --format json input.expr
$ maputnik-expr compile --format js input.expr
$ maputnik-expr run input.expr data.json
$ maputnik-expr run --d rank=1 zoom=1.1 input.expr
```


## Todo

 - Get rid of the need for `;`
 - Make javascript runner


```
case(
  ==(@type, "foo"), rgb(255, 0, 0),
  ==(@type, "bar"), rgb(0, 255, 0),
  rgb(0, 0, 255)
)
```

```
&line_width = 2

*(@rank, &line_width)
```

```
[
  "let", ["line_width", 2],
  ["*", ["var", "rank"], ["var", "line_width"]]
]
```


## License
[MIT](LICENSE)

