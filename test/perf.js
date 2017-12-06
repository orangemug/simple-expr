var Benchmark = require('benchmark');
var simpleExr = require("../");


var suite = new Benchmark.Suite;

var code = [
  {
    name: "simple",
    code: `concat("Hello", " ", @name)`
  },
  {
    name: "complex",
    code: `
    interpolate(
      linear(), @score,
      0, rgb(255, 0, 0),
      50, rgb(0, 255, 0),
      100, rgb(0, 0, 255)
    )
    `
  },
]

// Add in compiled code.
code.forEach(function(item) {
  item.json = simpleExr.compiler(item.code);
})

// Setup the benchmarks
code.forEach(function(item) {
  var name = item.name;
  var code = item.code;
  var json = item.json;

  suite.add(`simpleExr.compile(${name})`, function() {
    simpleExr.compiler(code);
  })

  suite.add(`simpleExr.decompile(${name})`, function() {
    simpleExr.decompile(json);
  })
})

// Setup logging
suite
  .on('cycle', function(event) {
    console.log(String(event.target));
  })
  .run({ 'async': true });

