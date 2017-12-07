function indexToColRow(input, positions) {
  var total = 0;
  var out = [];

  input.split("\n")
    .forEach(function(line, colIdx) {
      var prevTotal = total;
      total += line.length + 1/*The removed '\n' char */;

      positions.forEach(function(_pos, idx) {
        if(!out.hasOwnProperty(idx) && _pos < total) {
          out[idx] = {
            col: _pos - prevTotal,
            row: colIdx
          }
        }
      })
    })

  return out;
}

function colRowToIndex(input, positions) {
  var total = 0;
  var out = [];

  input.split("\n")
    .forEach(function(line, rowIdx) {
      positions.forEach(function(_pos, idx) {
        if(rowIdx == _pos.row) {
          out[idx] = total + _pos.col;
        }
      })

      total += line.length + 1/*The removed '\n' char */;
    })

  return out;
}

module.exports = {
  indexToColRow,
  colRowToIndex
}
