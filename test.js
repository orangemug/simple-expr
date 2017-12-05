var assert = require("assert");
var maputnikExpr = require("./");


const tests = [
  {
    name: "non-spec",
    opts: {
      typeCheck: false
    },
    input: `
      foo(1, "a", bar("2", "b", baz()))
    `,
    output: [
      "foo",
      1,
      "a",
      [
        "bar",
        "2",
        "b",
        ["baz"]
      ]
    ]
  },
  {
    name: "number arg function",
    input: `
    rgb(100,100,100)
    `,
    output: [
      "rgb", 100, 100, 100
    ]
  },
  {
    name: "string arg function",
    input: `
    concat("hello", " ", "world")
    `,
    output: [
      "concat", "hello", " ", "world"
    ]
  },
  {
    name: "nested functions",
    input: `
    concat(get("name"), " ", get("rank"))
    `,
    output: [
      "concat", ["get", "name"], " ", ["get", "rank"]
    ]
  },
  {
    name: "variables",
    input: `
    &foo = 1
    &bar = 2
    add(&foo, &bar) 
    `,
    throw: true
  },
  {
    name: "expression nesting",
    input: `
    *(/(1, 3), 4)
    `,
    output: [
      "*", ["/", 1, 3], 4
    ]
  },
]


describe("maputnik-expr", function() {
  describe("parse", function() {
    tests.forEach(function(test) {
      it(test.name, function() {
        var err, out;
        try {
          out = maputnikExpr.compiler(test.input);
        }
        catch(_err) {
          err = _err;
        }

        if(test.throw) {
          assert(err);
        }
        else if(err) {
          throw "Unexpected error: "+err;
        }
        else {
          assert.deepEqual(out, test.output)
        }
      })
    })
  })

  describe("stringify", null, function() {
    tests.forEach(function(test) {
      it(test.name, function() {
        assert.deepEqual(
          maputnikExpr.stringify(test.output, {newline: false}),
          test.input
        )
      })
    })
  })
})
