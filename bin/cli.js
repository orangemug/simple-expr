#!/usr/bin/env node
var fs         = require("fs");
var yargs      = require("yargs");
var simpleExpr = require("../");
var mgl        = require("@mapbox/mapbox-gl-style-spec");


function handleError(err) {
  console.log(err);
  process.eixt(1);
}

function parseOpts(str) {
  var out = {};
  str = str || "";

  var items = str
    .split(/\s+/)
    .filter(function(item) {
      return item != "";
    })

  items.forEach(function(item) {
    var parts = item.split("=")
    if(parts.length !== 2) {
      throw "Invalid format '"+item+"' expected format FOO=bar"
    }
    out[parts[0]] = parts[1];
  });

  return out;
}

function optOrStdin(filepath) {
  if(filepath) {
    return new Promise(function(resolve, reject) {
      fs.readFile(filepath, function(err, data) {
        if(err) {
          reject(err)
        }
        else {
          try {
            resolve(data.toString());
          }
          catch(err) {
            reject(err);
          }
        }
      })
    })
  }
  else {
    return new Promise(function(resolve, reject) {
      var raw = "";
      process.stdin.on('data', function(data) {
        raw += data;
      });
      process.stdin.on('end', function() {
        try {
          resolve(raw)
        } catch(err) {
          reject(err);
        }
      });
    })
  }
}

var argv = yargs
  .command(
    "parse",
    "code -> ast",
    function (yargs) {
      return yargs
    },
    function (argv) {
      optOrStdin(argv._[1])
        .then(function(data) {
          var ast = simpleExpr.parser(
            simpleExpr.tokenizer(data)
          )
          var json = JSON.stringify(ast, null, 2);
          console.log(json)
          process.exit(0)
        })
        .catch(handleError)
    }
  )
  .command(
    "compile",
    "code -> json",
    function (yargs) {
      return yargs
    },
    function(argv) {
      optOrStdin(argv._[1])
        .then(function(data) {
          var json = simpleExpr.compiler(data)
          console.log(JSON.stringify(json, null, 2))
          process.exit(0)
        })
        .catch(handleError)
    }
  )
  .command(
    "decompile",
    "json -> code",
    function (yargs) {
      return yargs
    },
    function(argv) {
      optOrStdin(argv._[1])
        .then(function(data) {
          var json;
          try {
            json = JSON.parse(data);
          }
          catch(err) {
            console.error("Invalid JSON");
            console.error(err);
            process.exit(1);
          }

          var code = simpleExpr.decompile(json);
          console.log(code);
          process.exit(0);
        })
        .catch(handleError)
    }
  )
  .command(
    "execute",
    "execute as js function",
    function (yargs) {
      return yargs
        .describe("feature-props", "feature properties")
        .describe("feature-id", "feature id")
        .describe("feature-type", "feature type")
        .describe("globals", "globals data")
    },
    function(argv) {
      var featureOpts = parseOpts(argv["feature-props"]);
      var globalOpts  = parseOpts(argv.globals);

      optOrStdin(argv._[1])
        .then(function(data) {
          var json = simpleExpr.compiler(data)

          var out = mgl.expression.createExpression(json, {})
          var result = out.value.evaluate(globalOpts, {
            id: argv["feature-id"],
            type: argv["feature-type"],
            properties: featureOpts
          })

          console.log(result);
          process.exit(0);
        })
        .catch(handleError)
    }
  )
  .example("simple-expr compile input.expr", "compile an expression")
  .example("simple-expr decompile input.json", "decompile an expression")
  .example("simple-expr compile input.expr | mgl-exec execute --data foo=1 bar=2", "Compile and run with some data")
  .argv;


if(argv._.length < 1) {
  yargs.showHelp();
}

