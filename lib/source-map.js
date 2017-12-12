const sourceMap = require("source-map");


function genOrigPosition(map, origPos, source) {
  const consumer = new sourceMap.SourceMapConsumer(map)
  const genPos = consumer.generatedPositionFor({
    line: origPos.line,
    column: origPos.column+1,
    source: source,
    bais: sourceMap.SourceMapConsumer.LEAST_UPPER_BOUND
  })

  const sourcePos = consumer.originalPositionFor(genPos);

  const newGenPos = {
    line: genPos.line,
    column: genPos.column
  };

  return newGenPos;
}

function getMappings(map) {
  const out = [];
  const consumer = new sourceMap.SourceMapConsumer(map)
  consumer.eachMapping(function(m) {
    out.push(m);
  })

  return out;
}


module.exports = {
  genOrigPosition,
  getMappings
};
