const sourceMap = require("source-map");


async function genOrigPosition(map, origPos, source) {
  const consumer = await new sourceMap.SourceMapConsumer(map)
  consumer.computeColumnSpans();

  const genPos = consumer.generatedPositionFor({
    line: origPos.line,
    column: origPos.column,
    source: source,
    // bias: sourceMap.SourceMapConsumer.LEAST_UPPER_BOUND
  })

  function getOrigPos(genPos, origPos) {
    let sourcePos;
    let skipRest = false;
    let offset = 0;
    console.log(">>>>>>>>>>>>>>")
    console.log("genPos", genPos);
    consumer.eachMapping(function (m) {
      if(skipRest) {
        return;
      }
      else if(
        m.originalLine == origPos.line
        && m.originalColumn == origPos.column
      )  {
        console.log("HERE???")
        sourcePos = m;
        skipRest = true;
        offset = 0;
      }
      else if(
        m.generatedLine <= genPos.line &&
        m.generatedColumn <= genPos.column
      ) {
        sourcePos = m;
        offset = origPos.column - sourcePos.originalColumn
        console.log("????m", sourcePos, origPos)
      }

      if(
        sourcePos &&
        sourcePos.originalColumn > origPos.column
      ) {
        offset = 0;
      }
      // console.log("m",m);
    })
    console.log("<<<<<<<<<<<<<")

    return offset
  }
  const sourcePos = consumer.originalPositionFor(Object.assign({
    // bias: sourceMap.SourceMapConsumer.LEAST_UPPER_BOUND
  }, genPos));

  var offset = getOrigPos(genPos, origPos);
  // console.log("::: foo", foo, origPos)

  // TODO: Offset incorrect!
  // const offset = origPos.column - foo.column
  console.log("offset", offset)

  const newGenPos = {
    line: genPos.line,
    column: Math.min(genPos.column+offset)
  };

  console.log("----------------");
  console.log("origPos", origPos);
  console.log("genPos", genPos);
  console.log("sourcePos", sourcePos);

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
