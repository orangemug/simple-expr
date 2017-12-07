var sourceMap = require("source-map");


function genOrigPosition(map, origPos, source) {
  var consumer = new sourceMap.SourceMapConsumer(map)
  var genPos = consumer.generatedPositionFor({
    line: origPos.line,
    column: origPos.column+1,
    source: source,
    bais: sourceMap.SourceMapConsumer.LEAST_UPPER_BOUND
  })

  var sourcePos = consumer.originalPositionFor(genPos);

  var newGenPos = {
    line: genPos.line,
    column: genPos.column-1
  };

  return newGenPos;
}

function getMappings(map) {
  var out = [];
  var consumer = new sourceMap.SourceMapConsumer(map)
  consumer.eachMapping(function(m) {
    out.push(m);
  })

  return out;
}


module.exports = {
  genOrigPosition,
  getMappings
};
