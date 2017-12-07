var assert = require("assert");
var readmeTester = require("readme-tester");
var simpleExpr = require("../");


const tests = [
  {
    name: "number: integer",
    input: `
      number(
        1
      )
    `,
    decompiled: "number(1)",
    output: ["number", 1]
  },
  {
    name: "number: integer",
    input: `
      number(1)
    `,
    output: ["number", 1]
  },
  {
    name: "number: integer with +sign",
    input: `
      number(+1)
    `,
    decompiled: `
      number(1)
    `,
    output: ["number", 1]
  },
  {
    name: "number: integer with -sign",
    input: `
      number(-1)
    `,
    output: ["number", -1]
  },
  {
    name: "number: float",
    input: `
      number(3.14)
    `,
    output: ["number", 3.14]
  },
  {
    name: "number: float with +sign",
    input: `
      number(+3.14)
    `,
    decompiled: `
      number(3.14)
    `,
    output: ["number", 3.14]
  },
  {
    name: "number: float with -sign",
    input: `
      number(-3.14)
    `,
    output: ["number", -3.14]
  },
  {
    name: "number: invalid float",
    input: `
      number(3.14.3)
    `,
    throw: true
  },
  {
    name: "string: simple",
    input: `
      string("hello")
    `,
    output: ["string", "hello"]
  },
  {
    name: "string: escaped",
    input: `
      string("\\\"")
    `,
    output: ["string", "\\\""]
  },
  {
    name: "string: missing quote",
    input: `
    concat("Hello", "world)
    `,
    throw: true
  },
  {
    name: "function: single arg",
    input: `
      foo(1)
    `,
    output: [
      "foo", 1
    ]
  },
  {
    name: "function: multiple args",
    input: `
      foo(1, "2", 3, "four")
    `,
    output: [
      "foo", 1, "2", 3, "four"
    ]
  },
  {
    name: "function: nested function",
    input: `
      foo(1, "2", bar(3, baz("four")))
    `,
    output: [
      "foo", 1, "2", ["bar", 3, ["baz", "four"]]
    ]
  },
  {
    name: "function: multiple top-level functions",
    input: `
      foo()
      bar()
    `,
    throw: true
  },
  {
    name: "function: no top-level function",
    input: `
    `,
    output: [
    ]
  },
  {
    name: "function: missing arg separator",
    input: `
    concat("hello" "world")
    `,
    throw: true,
  },
  {
    name: "function: context references",
    input: `
    rgb(@score, @rank, 0) 
    `,
    output: [
      "rgb", ["get", "score"], ["get", "rank"], 0
    ]
  },
  {
    name: "function: context references (alt)",
    input: `
    rgb(0, @score, @rank) 
    `,
    output: [
      "rgb", 0, ["get", "score"], ["get", "rank"]
    ]
  },
  {
    name: "function: missing paren",
    input: `
    rgb(0, @score, @rank
    `,
    throw: true
  },
  {
    name: "function: with numbers",
    input: `
    log10(1)
    `,
    output: [
      "log10", 1
    ]
  },
  {
    name: "function: with starting number",
    input: `
    1func(1)
    `,
    throw: true
  },
  {
    name: "function: with dashes",
    input: `
    to-color(1)
    `,
    output: [
      "to-color", 1
    ]
  },
]

var awkwardNames = [
  {name: "!"},
  {name: "!="},
  {name: "<"},
  {name: "<="},
  {name: "=="},
  {name: ">"},
  {name: ">="},
  {name: "-", skip: true},
  {name: "*"},
  {name: "/"},
  {name: "%"},
  {name: "^"},
  {name: "+", skip: true},
  {name: "e"}
];
awkwardNames.forEach(function(def) {
  var name = def.name;
  tests.push({
    name: "function: awkward name: "+name,
    input: name+"(0, 1)",
    skip: def.skip,
    output: [
      name, 0, 1
    ]
  })
})


function buildTest(test, runner) {
  var name = test.name;
  if(test.throw) {
    name += " (throws error)";
  }

  function fn() {
    var err, out;
    try {
      out = runner.fn();
    }
    catch(_err) {
      err = _err;
    }

    if(test.throw) {
      assert(err);
    }
    else if(err) {
      throw err;
    }
    else {
      runner.assertion(out);
    }
  }

  if(test.only) {
    it.only(name, fn);
  }
  else if(test.skip) {
    it.skip(name, fn);
  }
  else {
    it(name, fn);
  }
}


describe("simple-expr", function() {
  describe("compile", function() {
    tests.forEach(function(test) {
      buildTest(test, {
        fn: function() {
          return simpleExpr.compiler(test.input);
        },
        assertion: function(actual) {
          assert.deepEqual(actual, test.output)
        }
      })
    })
  })

  describe("decompile", function() {
    tests.forEach(function(test) {
      buildTest(test, {
        fn: function() {
          return simpleExpr.decompile(simpleExpr.compiler(test.input));
        },
        assertion: function(actual) {
          var expected = test.decompiled || test.input;
          expected = expected
            .replace(/^\s+/, "")
            .replace(/\s+$/, "")

          assert.deepEqual(actual, expected)
        }
      })
    })
  })

  describe("stringify", null, function() {
    tests.forEach(function(test) {
      it(test.name, function() {
        assert.deepEqual(
          simpleExpr.stringify(test.output, {newline: false}),
          test.input
        )
      })
    })
  })

  describe("cli", function() {
    it("parse")
    it("compile")
    it("decompile")
    it("execute")
  })

  it.skip("README.md", function(done) {
    this.timeout(10*1000);
    readmeTester(__dirname+"/../README.md", {bash: true}, function(err, assertions) {
      assert.ifError(err);
      done(err);
    });
  })
})
