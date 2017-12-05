var fs = require("fs");
var yargs = require("yargs");

function optOrStdin(filepath) {
  if(filepath) {
    return new Promise(function(resolve, reject) {
      fs.readFile(filepath, function(err, data) {
        if(err) {
          reject(err)
        }
        else {
          try {
            resolve(JSON.parse(data.toString()));
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
          resolve(JSON.parse(raw))
        } catch(err) {
          reject(err);
        }
      });
    })
  }
}

var argv = yargs
  .command(
    "parse [file]",
    "code -> ast",
    function (yargs) {
      return yargs;
    },
    function (argv) {
      console.log(argv._[1])
      optOrStdin(argv._[1])
        .then(function(data) {
          console.log("data", data)
        })
    }
  )
  .command("compile", "code -> json")
  .command("decompile", "json -> code")
  .command("execute", "execute as js function")
  .example("simple-expr compile input.expr", "compile an expression")
  .example("simple-expr decompile input.json", "decompile an expression")
  .example("simple-expr compile input.expr | mgl-exec execute --data foo=1 bar=2", "Compile and run with some data")
  .argv;


