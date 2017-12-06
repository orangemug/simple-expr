var simpleExpr = require("../");

var inputEl  = document.querySelector(".input");
var debugEl  = document.querySelector(".debug");
var outputEl = document.querySelector(".output");

function update() {
  var input = inputEl.value;

  var pos = {
    start: inputEl.selectionStart,
    end:   inputEl.selectionEnd
  };

  function findPos(input, positions) {
    var total = 0;
    var out = [];

    input.split("\n")
      .forEach(function(line, colIdx) {
        var prevTotal = total;
        total += line.length + 1/*The removed '\n' char */;

        positions.forEach(function(_pos, idx) {
          if(!out.hasOwnProperty(idx) && _pos < total) {
            out[idx] = {
              row: _pos - prevTotal,
              col: colIdx
            }
          }
        })
      })

    return out;
  }

  function findPosFromCol(input, positions) {
    var total = 0;
    var out = [];

    input.split("\n")
      .forEach(function(line, colIdx) {
        positions.forEach(function(_pos, idx) {
          if(colIdx == _pos.col) {
            out[idx] = total + _pos.row;
          }
        })

        total += line.length + 1/*The removed '\n' char */;
      })

    return out;
  }

  var colrow = findPos(input, [pos.start, pos.end]);
  console.log("colrow", colrow);

  try {
    var json = simpleExpr.compiler(input);
    var code = simpleExpr.decompile(json);

    var colRowNew = findPosFromCol(code, colrow);
    console.log("colRowNew", colRowNew);

    if(colRowNew.length > 0) {
      if(colRowNew.length < 2) {
        colRowNew[1] = code.length;
      }

      code = code.substring(0, colRowNew[0])
        + "<span class='debug-selected'>"+code.substring(colRowNew[0], colRowNew[1])+"</span>"
        + code.substring(colRowNew[1])
    }

    outputEl.innerHTML = code;
  }
  catch(err) {
    outputEl.innerHTML = "ERR: "+err;
  }

  debugEl.innerHTML = "cursor: "+JSON.stringify(colrow);

}

inputEl.addEventListener("keyup", update);
inputEl.addEventListener("mouseup", update);
update();
