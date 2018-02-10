const sourceMap = require("source-map");


async function genOrigPosition(map, origPos, source) {
  const consumer = await new sourceMap.SourceMapConsumer(map)
  consumer.computeColumnSpans();

  const genPos = consumer.generatedPositionFor({
    line: origPos.line,
    column: origPos.column,
    source: source,
  })

  function getOrigPos(genPos, origPos) {
    let sourcePos;
    let skipRest = false;
    let offset = 0;

    consumer.eachMapping(function (m) {
      if(skipRest) {
        return;
      }
      // If we've found an exact match stop!
      else if(
        m.originalLine == origPos.line
        && m.originalColumn == origPos.column
      )  {
        sourcePos = m;
        skipRest = true;
        offset = 0;
      }
      // If we're still behind our target
      else if(
        m.generatedLine <= genPos.line &&
        m.generatedColumn <= genPos.column
      ) {
        sourcePos = m;
        offset = origPos.column - sourcePos.originalColumn
      }

      // If the cursor position is ahead of sourcePos reset the offset
      if(
        sourcePos &&
        sourcePos.originalColumn > origPos.column
      ) {
        offset = 0;
      }
    })

    return offset
  }

  const sourcePos = consumer.originalPositionFor(genPos);

  var offset = getOrigPos(genPos, origPos);

  const newGenPos = {
    line: genPos.line,
    column: Math.min(genPos.column+offset)
  };

  return newGenPos;
}

async function getMappings(map) {
  const out = [];
  const consumer = await new sourceMap.SourceMapConsumer(map)
  consumer.eachMapping(function(m) {
    out.push(m);
  })

  return out;
}


module.exports = {
  genOrigPosition,
  getMappings
};
