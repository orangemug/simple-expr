var simpleExpr = require("../");
var textblock = require("../lib/textblock");
var delegate = require('dom-delegate');


var inputEl  = document.querySelector(".input");
var debugEl  = document.querySelector(".debug");
var outputEl = document.querySelector(".output");
var mappingsSourceEl = document.querySelector(".mappings-source");
var mappingsGeneratedEl = document.querySelector(".mappings-generated");

var sourceMap = require("../lib/source-map");

function update() {
  var input = inputEl.value;

  var pos = {
    start: inputEl.selectionStart,
    end:   inputEl.selectionEnd
  };

  var orignalPos = textblock.indexToColRow(input, [pos.start, pos.end]);

  try {
    var tokens = simpleExpr.tokenize(input);
    var ast = simpleExpr.parse(tokens);
    var newTokens = simpleExpr.unparse(ast);
    var codeBits = simpleExpr.untokenize(newTokens);
    var code = codeBits.code;
    var map = codeBits.map;


    // Get the original position of the node
    var startGeneratedPos = sourceMap.genOrigPosition(map, {
      line:   orignalPos[0].row+1,
      // IS this a HACK
      column: orignalPos[0].col-1,
    }, "foo.js");

    var endGeneratedPos = sourceMap.genOrigPosition(map, {
      line:   orignalPos[1].row+1,
      // IS this a HACK
      column: orignalPos[1].col-1,
    }, "foo.js");

    var newPos = textblock.colRowToIndex(code, [
      {
        row: startGeneratedPos.line-1,
        col: startGeneratedPos.column
      },
      {
        row: endGeneratedPos.line-1,
        col: endGeneratedPos.column
      },
    ])

    if(newPos.length > 0) {
      if(newPos.length < 2) {
        newPos[1] = code.length;
      }

      var hlCode = code.substring(0, newPos[0])
        + "<span class='debug-selected'>"+code.substring(newPos[0], newPos[1])+"</span>"
        + code.substring(newPos[1])
    }


    var mappings = sourceMap.getMappings(map)

    function insertIntoString(orig, idx, text) {
      return orig.substring(0, idx) + text + orig.substring(idx);
    }

    var offset = 0;
    var mappedCode = code + "";
    mappings.forEach(function(mapping, idx) {
      var opts = {row: mapping.generatedLine-1, col: mapping.generatedColumn}
      var pos = textblock.colRowToIndex(code, [opts])[0];

      pos += offset;
      var toInsert = "<span data-type=\"original\" data-idx=\""+idx+"\" class=\"mapping\"></span>";
      offset += toInsert.length;
      mappedCode = insertIntoString(mappedCode, pos, toInsert)
    })

    mappingsGeneratedEl.innerHTML = mappedCode;

    var offset = 0;
    var origCode = input + "";
    mappings.forEach(function(mapping, idx) {
      var opts = {row: mapping.originalLine-1, col: mapping.originalColumn}
      var pos = textblock.colRowToIndex(input, [opts])[0];

      pos += offset;
      var toInsert = "<span data-type=\"generated\" data-idx=\""+idx+"\" class=\"mapping\"></span>";
      offset += toInsert.length;
      origCode = insertIntoString(origCode, pos, toInsert)
    })

    mappingsSourceEl.innerHTML = origCode;

    outputEl.innerHTML = hlCode;
  }
  catch(err) {
    console.error("err", err);
    outputEl.innerHTML = "ERR: "+err;
  }

  debugEl.innerHTML = "cursor: "+JSON.stringify(newPos);

}

inputEl.addEventListener("keydown", function(e) {
  // // Allow tabs
  // if(e.keyCode === 9) {
		// var start = this.selectionStart;
		// var end = this.selectionEnd;

		// var value = inputEl.value;

		// inputEl.value = value.substring(0, start)
			// + "  "
			// + value.substring(end);

		// // put caret at right position again (add one for the tab)
		// inputEl.selectionStart = inputEl.selectionEnd = start + 2;

		// // prevent the focus lose
		// e.preventDefault();
  // }
});

inputEl.addEventListener("keyup", update);
inputEl.addEventListener("keydown", update);
inputEl.addEventListener("click", update);

var del = delegate(document.body);
del.on("mouseover", ".mapping", function(e, target) {
  var type = target.getAttribute("data-type");
  var idx  = target.getAttribute("data-idx");
})

var downHdl;
inputEl.addEventListener("mousedown", function() {
  downHdl = setInterval(update, 1000/60);
});

document.addEventListener("mouseup", function() {
  clearInterval(downHdl);
});
update();
