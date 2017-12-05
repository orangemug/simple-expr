(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * This parser was built from <https://github.com/thejameskyle/the-super-tiny-compiler>
 */

function tokenizer(input) {
  let current = 0;

  let tokens = [];

  while (current < input.length) {
    let char = input[current];

    if (char === '(') {
      tokens.push({
        type: 'paren',
        value: '(',
      });
      current++;
      continue;
    }
    if (char === ')') {
      tokens.push({
        type: 'paren',
        value: ')',
      });
      current++;
      continue;
    }
    if(char === ",") {
      tokens.push({
        type: 'arg_sep'
      });
      current++;
      continue;
    }

    // Whitespace is ignored
    // Note: whitespace in strings are handled separately in the string handler
    let WHITESPACE = /\s/;
    if (WHITESPACE.test(char)) {
      current++;
      continue;
    }

    let NUMBERS = /[-+.0-9]/;
    if (NUMBERS.test(char)) {
      let value = '';

      while (NUMBERS.test(char)) {
        value += char;
        char = input[++current];
      }

      if(!value.match(/^[+-]?([0-9]*\.)?[0-9]+$/)) {
        throw "Invalid number '"+value+"'"
      }

      tokens.push({ type: 'number', value });
      continue;
    }

    // Variable
		if (char === '&') {
      let value = '';

      // Skip the '&'
      char = input[++current];

      while (char.match(/[a-zA-Z0-9_]/)) {
        value += char;
        char = input[++current];
      }

      tokens.push({ type: 'var_ref', value });

      continue;
		}

    // Feature reference
		if (char === '@') {
      let value = '';

      // Skip the '@'
      char = input[++current];

      while (char.match(/[a-zA-Z0-9_]/)) {
        value += char;
        char = input[++current];
      }

      tokens.push({ type: 'feature_ref', value });
      continue;
		}

		if (char === '"') {
      // Keep a `value` variable for building up our string token.
      let value = '';

      // We'll skip the opening double quote in our token.
      char = input[++current];

      // Iterate through each character until we reach another double quote.
      var prev;
      while (prev === "\\" || char !== '"') {
        value += char;
        prev = char;
        char = input[++current];
        if(char === undefined) {
          throw "Missing closing quote";
        }
      }

      if(char !== "\"") {
        throw "Missing closing quote"
      }

      // Skip the closing double quote.
      char = input[++current];

      tokens.push({ type: 'string', value });

      continue;
		}


    let LETTERS = /[^)( \t]/i;
    if (LETTERS.test(char)) {
      let value = '';

			// This allows for log10 method name but not 10log
      while (char && LETTERS.test(char)) {
        value += char;
        char = input[++current];
      }

      // And pushing that value as a token with the type `name` and continuing.
      tokens.push({ type: 'name', value });

      continue;
		}

    throw new TypeError('I don\'t know what this character is: ' + char);
  }

	return tokens;
}

function parser(tokens, depth) {
  depth = depth || 0;

  // Cursor
  let current = 0;

  function walk() {

    let token = tokens[current];
    let prevToken = tokens[current-1];

    var prevIsSep = (
      !prevToken
      || prevToken.type === "arg_sep"
      || prevToken.type === "paren"
    )

    if(token.type === "arg_sep") {
      token = tokens[++current];
    }
    else if(!prevIsSep) {
      // Any argument **must** pre proceeded with a separtor
      throw "Expecting argument separator";
    }

    if (token.type === 'number') {

      // If we have one, we'll increment `current`.
      current++;

      var value = token.value;

      // Work out the type
      if(token.value.match(/[.]/)) {
        value = parseFloat(value, 10);
      }
      else {
        value = parseInt(value, 10);
      }

      return {
        type: 'NumberLiteral',
        value: value
      };
    }

    if (token.type === 'string') {
      current++;

      return {
        type: 'StringLiteral',
        value: token.value,
      };
    }

    if (token.type === 'feature_ref') {
      current++;

      return {
        type: 'FeatureRef',
        value: token.value,
      };
    }

    if (token.type === 'var_ref') {
      current++;

      return {
        type: 'VarRef',
        value: token.value,
      };
    }

    if(
      token.type === 'name'
    ) {
      token = tokens[current++];

      let node = {
        type: 'CallExpression',
        name: token.value,
        params: [],
      };

      if(
        tokens[current].type === 'paren' &&
        tokens[current].value !== '('
      ) {
        throw "Missing opening parenthesis";
      }

      // ... and skip the opening parenthesis.
      token = tokens[++current];

      while (
        token && 
        (
          (token.type !== 'paren') ||
          (token.type === 'paren' && token.value !== ')')
        )
      ) {
        // we'll call the `walk` function which will return a `node` and we'll
        // push it into our `node.params`.
        node.params.push(walk());
        token = tokens[current];
      }


      // Check there are some closing parenthesis
      if(!token || token.type !== "paren" || token.value !== ")") {
        throw "Missing paren"
      }
      // ... and skip the closing parenthesis.
      current++;

      return node;
    }

    // Token not recognized
    throw new TypeError(token.type);
  }

  let ast = {
    type: 'Program',
    body: [],
  };

  while (current < tokens.length) {
    ast.body.push(walk());
  }

  if(depth === 0 && ast.body.length > 1) {
    throw "Only allowed one top level expression";
  }

  return ast;
}

function transformer(nodes) {
  function walk(node) {
    if(node.type === "CallExpression") {
      var args = node.params.map(function(node) {
        return walk(node)
      })
      return [node.name].concat(args);
    }
    else if (node.type === "StringLiteral") {
      return node.value;
    }
    else if (node.type === "NumberLiteral") {
      return node.value;
    }
    else if (node.type === "FeatureRef") {
      return ["get", node.value];
    }
    else if (node.type === "VarRef") {
      return ["var", node.value];
    }
  }

  if(nodes.body.length < 1) {
    return [];
  }
  else {
    return walk(nodes.body[0]);
  }
}

function compiler(input) {
  let tokens = tokenizer(input);
  let ast    = parser(tokens);
  let output = transformer(ast);

  return output;
}

function codeGenerator(nodes) {
  function walk(node) {
    var out;

    if(node.type === "CallExpression") {
      var args = node.params.map(function(node) {
        return walk(node)
      }).join(",");

      out = node.name+"("+args+")";
    }
    else if (node.type === "StringLiteral") {
      out = JSON.stringify(node.value);
    }
    else if (node.type === "NumberLiteral") {
      out = JSON.stringify(node.value);
    }
    else if (node.type === "FeatureRef") {
      out = "@"+node.value;
    }
    else if (node.type === "VarRef") {
      out = "&"+node.value;
    }
    else {
      throw "Invalid node "+JSON.stringify(node);
    }

    return out;
  }

  return nodes.body.map(function(node) {
    return walk(node);
  }).join("")
}


module.exports = {
  tokenizer,
  parser,
  transformer,
  compiler,
  codeGenerator
};


},{}],2:[function(require,module,exports){
var simpleExpr = require("../");

function makePoint(lon, lat, props) {
  return {
    "type": "Feature",
    "geometry": {
      "type": "Point",
      "coordinates": [lon, lat]
    },
    "properties": props
  }
}

var state = {
  geojson: {
    "type": "FeatureCollection",
    "features": [
      makePoint(8.5217, 47.3769, {score: 20}),
      makePoint(8.5317, 47.3569, {score: 40}),
      makePoint(8.5417, 47.3969, {score: 60}),
      makePoint(8.5517, 47.3869, {score: 80}),
      makePoint(8.5117, 47.3769, {score: 100})
    ]
  },
  code: "rgb(@score, 100, 100)",
  error: "",
  result: ""
}

var editorEl   = document.querySelector("textarea");
var resultEl   = document.querySelector(".result");
var geojsonEl  = document.querySelector(".geojson");
var mapEl      = document.querySelector(".map");
var examplesEl = document.querySelector(".examples");


var EXAMPLES = [
  {
    name: "color on score",
    code: [
      "interpolate(",
      "  linear(), @score,",
      "  0, rgb(255, 0, 0),",
      "  50, rgb(0, 255, 0),",
      "  100, rgb(0, 0, 255)",
      ")"
    ].join("\n")
  },
  {
    name: "interpolate on zoom",
    code: [
      "interpolate(",
      "  linear(), zoom()",
      "  0, rgb(0, 0, 0),",
      "  11, rgb(255, 0, 0),",
      "  16, rgb(0, 255, 0),",
      "  22, rgb(0, 0, 255)",
      ")"
    ].join("\n")
  },
];

examplesEl.innerHTML = EXAMPLES.map(function(example) {
  return "<option>"+example.name+"</option>"
}).join("")

editorEl.addEventListener("keyup", change);
function change(e) {
  state.code = editorEl.value;
  state.error = "";

  try {
    state.result = simpleExpr.compiler(state.code)
  }
  catch(err) {
    console.error(err);
    state.error = err;
  }

  render();
}

function render() {
  if(state.error) {
    resultEl.innerHTML = '<div class="error">'+state.error+'</div>'
  }
  else {
    resultEl.innerHTML = JSON.stringify(state.result, null, 2);
  }

  geojsonEl.innerHTML = JSON.stringify(state.geojson, null, 2);

  var style = buildStyle({
    sources: {
      "demo": {
        "type": "geojson",
        "data": state.geojson
      }
    },
    layers: [
      {
        "id": "example",
        "type": "circle",
        "source": "demo",
        "paint": {
          "circle-color": state.result,
          "circle-radius": 6
        }
      }
    ]
  })

  map.setStyle(style);
}

var BASE_STYLE = require("./base-style.json");

function buildStyle(opts) {
  var baseStyle = JSON.parse(
    JSON.stringify(BASE_STYLE)
  );

  baseStyle.sources = Object.assign(baseStyle.sources, opts.sources)
  baseStyle.layers = baseStyle.layers.concat(opts.layers);
  return baseStyle;
}

var map = new mapboxgl.Map({
  container: mapEl,
  style: 'https://free.tilehosting.com/styles/positron/style.json?key=ozKuiN7rRsPFArLI4gsv',
  center: [8.5456, 47.3739],
  zoom: 11
});

examplesEl.addEventListener("change", function() {
  editorEl.value = EXAMPLES[examplesEl.selectedIndex].code;
  change();
})

editorEl.value = EXAMPLES[examplesEl.selectedIndex].code;
change();





},{"../":1,"./base-style.json":3}],3:[function(require,module,exports){
module.exports={"version":8,"name":"Positron","metadata":{"mapbox:autocomposite":false,"mapbox:type":"template","mapbox:groups":{"b6371a3f2f5a9932464fa3867530a2e5":{"name":"Transportation","collapsed":false},"a14c9607bc7954ba1df7205bf660433f":{"name":"Boundaries"},"101da9f13b64a08fa4b6ac1168e89e5f":{"name":"Places","collapsed":false}},"openmaptiles:version":"3.x","openmaptiles:mapbox:owner":"openmaptiles","openmaptiles:mapbox:source:url":"mapbox://openmaptiles.4qljc88t"},"center":[10.184401828277089,-1.1368683772161603e-13],"zoom":0.8902641636539237,"bearing":0,"pitch":0,"sources":{"openmaptiles":{"type":"vector","url":"https://free.tilehosting.com/data/v3.json?key=ozKuiN7rRsPFArLI4gsv"}},"sprite":"https://free.tilehosting.com/styles/positron/sprite","glyphs":"https://free.tilehosting.com/fonts/{fontstack}/{range}.pbf?key=ozKuiN7rRsPFArLI4gsv","layers":[{"id":"background","type":"background","paint":{"background-color":"rgb(242,243,240)"}},{"id":"park","type":"fill","source":"openmaptiles","source-layer":"park","filter":["==","$type","Polygon"],"layout":{"visibility":"visible"},"paint":{"fill-color":"rgb(230, 233, 229)"}},{"id":"water","type":"fill","source":"openmaptiles","source-layer":"water","filter":["==","$type","Polygon"],"layout":{"visibility":"visible"},"paint":{"fill-color":"rgb(194, 200, 202)","fill-antialias":true,"fill-outline-color":{"base":1,"stops":[[0,"hsla(180, 6%, 63%, 0.82)"],[22,"hsla(180, 6%, 63%, 0.18)"]]}}},{"id":"landcover_ice_shelf","type":"fill","source":"openmaptiles","source-layer":"landcover","maxzoom":8,"filter":["all",["==","$type","Polygon"],["==","subclass","ice_shelf"]],"layout":{"visibility":"visible"},"paint":{"fill-color":"hsl(0, 0%, 98%)","fill-opacity":0.7}},{"id":"landcover_glacier","type":"fill","source":"openmaptiles","source-layer":"landcover","maxzoom":8,"filter":["all",["==","$type","Polygon"],["==","subclass","glacier"]],"layout":{"visibility":"visible"},"paint":{"fill-color":"hsl(0, 0%, 98%)","fill-opacity":{"base":1,"stops":[[0,1],[8,0.5]]}}},{"id":"landuse_residential","type":"fill","source":"openmaptiles","source-layer":"landuse","maxzoom":16,"filter":["all",["==","$type","Polygon"],["==","class","residential"]],"layout":{"visibility":"visible"},"paint":{"fill-color":"rgb(234, 234, 230)","fill-opacity":{"base":0.6,"stops":[[8,0.8],[9,0.6]]}}},{"id":"landcover_wood","type":"fill","source":"openmaptiles","source-layer":"landcover","minzoom":10,"filter":["all",["==","$type","Polygon"],["==","class","wood"]],"layout":{"visibility":"visible"},"paint":{"fill-color":"rgb(220,224,220)","fill-opacity":{"base":1,"stops":[[8,0],[12,1]]}}},{"id":"waterway","type":"line","source":"openmaptiles","source-layer":"waterway","filter":["==","$type","LineString"],"layout":{"visibility":"visible"},"paint":{"line-color":"hsl(195, 17%, 78%)"}},{"id":"water_name","type":"symbol","source":"openmaptiles","source-layer":"water_name","filter":["all",["==","$type","LineString"],["!has","name:en"]],"layout":{"text-field":"{name:latin} {name:nonlatin}","symbol-placement":"line","text-rotation-alignment":"map","symbol-spacing":500,"text-font":["Metropolis Medium Italic","Klokantech Noto Sans Italic","Klokantech Noto Sans CJK Regular"],"text-size":12},"paint":{"text-color":"rgb(157,169,177)","text-halo-color":"rgb(242,243,240)","text-halo-width":1,"text-halo-blur":1}},{"id":"water_name-en","type":"symbol","source":"openmaptiles","source-layer":"water_name","filter":["all",["==","$type","LineString"],["has","name:en"]],"layout":{"text-field":"{name:en} {name:nonlatin}","symbol-placement":"line","text-rotation-alignment":"map","symbol-spacing":500,"text-font":["Metropolis Medium Italic","Klokantech Noto Sans Italic","Klokantech Noto Sans CJK Regular"],"text-size":12},"paint":{"text-color":"rgb(157,169,177)","text-halo-color":"rgb(242,243,240)","text-halo-width":1,"text-halo-blur":1}},{"id":"building","type":"fill","source":"openmaptiles","source-layer":"building","minzoom":12,"filter":["==","$type","Polygon"],"paint":{"fill-color":"rgb(234, 234, 229)","fill-outline-color":"rgb(219, 219, 218)","fill-antialias":true}},{"id":"tunnel_motorway_casing","type":"line","metadata":{"mapbox:group":"b6371a3f2f5a9932464fa3867530a2e5"},"source":"openmaptiles","source-layer":"transportation","minzoom":6,"filter":["all",["==","$type","LineString"],["all",["==","brunnel","tunnel"],["==","class","motorway"]]],"layout":{"line-cap":"butt","line-join":"miter","visibility":"visible"},"paint":{"line-color":"rgb(213, 213, 213)","line-width":{"base":1.4,"stops":[[5.8,0],[6,3],[20,40]]},"line-opacity":1}},{"id":"tunnel_motorway_inner","type":"line","metadata":{"mapbox:group":"b6371a3f2f5a9932464fa3867530a2e5"},"source":"openmaptiles","source-layer":"transportation","minzoom":6,"filter":["all",["==","$type","LineString"],["all",["==","brunnel","tunnel"],["==","class","motorway"]]],"layout":{"line-cap":"round","line-join":"round","visibility":"visible"},"paint":{"line-color":"rgb(234,234,234)","line-width":{"base":1.4,"stops":[[4,2],[6,1.3],[20,30]]}}},{"id":"aeroway-taxiway","type":"line","metadata":{"mapbox:group":"1444849345966.4436"},"source":"openmaptiles","source-layer":"aeroway","minzoom":12,"filter":["all",["in","class","taxiway"]],"layout":{"line-cap":"round","line-join":"round","visibility":"visible"},"paint":{"line-color":"hsl(0, 0%, 88%)","line-width":{"base":1.55,"stops":[[13,1.8],[20,20]]},"line-opacity":1}},{"id":"aeroway-runway-casing","type":"line","metadata":{"mapbox:group":"1444849345966.4436"},"source":"openmaptiles","source-layer":"aeroway","minzoom":11,"filter":["all",["in","class","runway"]],"layout":{"line-cap":"round","line-join":"round","visibility":"visible"},"paint":{"line-color":"hsl(0, 0%, 88%)","line-width":{"base":1.5,"stops":[[11,6],[17,55]]},"line-opacity":1}},{"id":"aeroway-area","type":"fill","metadata":{"mapbox:group":"1444849345966.4436"},"source":"openmaptiles","source-layer":"aeroway","minzoom":4,"filter":["all",["==","$type","Polygon"],["in","class","runway","taxiway"]],"layout":{"visibility":"visible"},"paint":{"fill-opacity":{"base":1,"stops":[[13,0],[14,1]]},"fill-color":"rgba(255, 255, 255, 1)"}},{"id":"aeroway-runway","type":"line","metadata":{"mapbox:group":"1444849345966.4436"},"source":"openmaptiles","source-layer":"aeroway","minzoom":11,"filter":["all",["in","class","runway"],["==","$type","LineString"]],"layout":{"line-cap":"round","line-join":"round","visibility":"visible"},"paint":{"line-color":"rgba(255, 255, 255, 1)","line-width":{"base":1.5,"stops":[[11,4],[17,50]]},"line-opacity":1},"maxzoom":24},{"id":"highway_path","type":"line","metadata":{"mapbox:group":"b6371a3f2f5a9932464fa3867530a2e5"},"source":"openmaptiles","source-layer":"transportation","filter":["all",["==","$type","LineString"],["==","class","path"]],"layout":{"line-cap":"round","line-join":"round","visibility":"visible"},"paint":{"line-color":"rgb(234, 234, 234)","line-width":{"base":1.2,"stops":[[13,1],[20,10]]},"line-opacity":0.9}},{"id":"highway_minor","type":"line","metadata":{"mapbox:group":"b6371a3f2f5a9932464fa3867530a2e5"},"source":"openmaptiles","source-layer":"transportation","minzoom":8,"filter":["all",["==","$type","LineString"],["in","class","minor","service","track"]],"layout":{"line-cap":"round","line-join":"round","visibility":"visible"},"paint":{"line-color":"hsl(0, 0%, 88%)","line-width":{"base":1.55,"stops":[[13,1.8],[20,20]]},"line-opacity":0.9}},{"id":"highway_major_casing","type":"line","metadata":{"mapbox:group":"b6371a3f2f5a9932464fa3867530a2e5"},"source":"openmaptiles","source-layer":"transportation","minzoom":11,"filter":["all",["==","$type","LineString"],["in","class","primary","secondary","tertiary","trunk"]],"layout":{"line-cap":"butt","line-join":"miter","visibility":"visible"},"paint":{"line-color":"rgb(213, 213, 213)","line-dasharray":[12,0],"line-width":{"base":1.3,"stops":[[10,3],[20,23]]}}},{"id":"highway_major_inner","type":"line","metadata":{"mapbox:group":"b6371a3f2f5a9932464fa3867530a2e5"},"source":"openmaptiles","source-layer":"transportation","minzoom":11,"filter":["all",["==","$type","LineString"],["in","class","primary","secondary","tertiary","trunk"]],"layout":{"line-cap":"round","line-join":"round","visibility":"visible"},"paint":{"line-color":"#fff","line-width":{"base":1.3,"stops":[[10,2],[20,20]]}}},{"id":"highway_major_subtle","type":"line","metadata":{"mapbox:group":"b6371a3f2f5a9932464fa3867530a2e5"},"source":"openmaptiles","source-layer":"transportation","maxzoom":11,"filter":["all",["==","$type","LineString"],["in","class","primary","secondary","tertiary","trunk"]],"layout":{"line-cap":"round","line-join":"round","visibility":"visible"},"paint":{"line-color":"hsla(0, 0%, 85%, 0.69)","line-width":2}},{"id":"highway_motorway_casing","type":"line","metadata":{"mapbox:group":"b6371a3f2f5a9932464fa3867530a2e5"},"source":"openmaptiles","source-layer":"transportation","minzoom":6,"filter":["all",["==","$type","LineString"],["all",["!in","brunnel","bridge","tunnel"],["==","class","motorway"]]],"layout":{"line-cap":"butt","line-join":"miter","visibility":"visible"},"paint":{"line-color":"rgb(213, 213, 213)","line-width":{"base":1.4,"stops":[[5.8,0],[6,3],[20,40]]},"line-dasharray":[2,0],"line-opacity":1}},{"id":"highway_motorway_inner","type":"line","metadata":{"mapbox:group":"b6371a3f2f5a9932464fa3867530a2e5"},"source":"openmaptiles","source-layer":"transportation","minzoom":6,"filter":["all",["==","$type","LineString"],["all",["!in","brunnel","bridge","tunnel"],["==","class","motorway"]]],"layout":{"line-cap":"round","line-join":"round","visibility":"visible"},"paint":{"line-color":{"base":1,"stops":[[5.8,"hsla(0, 0%, 85%, 0.53)"],[6,"#fff"]]},"line-width":{"base":1.4,"stops":[[4,2],[6,1.3],[20,30]]}}},{"id":"highway_motorway_subtle","type":"line","metadata":{"mapbox:group":"b6371a3f2f5a9932464fa3867530a2e5"},"source":"openmaptiles","source-layer":"transportation","maxzoom":6,"filter":["all",["==","$type","LineString"],["==","class","motorway"]],"layout":{"line-cap":"round","line-join":"round","visibility":"visible"},"paint":{"line-color":"hsla(0, 0%, 85%, 0.53)","line-width":{"base":1.4,"stops":[[4,2],[6,1.3]]}}},{"id":"railway_service","type":"line","metadata":{"mapbox:group":"b6371a3f2f5a9932464fa3867530a2e5"},"source":"openmaptiles","source-layer":"transportation","minzoom":16,"filter":["all",["==","$type","LineString"],["all",["==","class","rail"],["has","service"]]],"layout":{"visibility":"visible","line-join":"round"},"paint":{"line-color":"#dddddd","line-width":3}},{"id":"railway_service_dashline","type":"line","metadata":{"mapbox:group":"b6371a3f2f5a9932464fa3867530a2e5"},"source":"openmaptiles","source-layer":"transportation","minzoom":16,"filter":["all",["==","$type","LineString"],["==","class","rail"],["has","service"]],"layout":{"visibility":"visible","line-join":"round"},"paint":{"line-color":"#fafafa","line-width":2,"line-dasharray":[3,3]}},{"id":"railway","type":"line","metadata":{"mapbox:group":"b6371a3f2f5a9932464fa3867530a2e5"},"source":"openmaptiles","source-layer":"transportation","minzoom":13,"filter":["all",["==","$type","LineString"],["all",["!has","service"],["==","class","rail"]]],"layout":{"visibility":"visible","line-join":"round"},"paint":{"line-color":"#dddddd","line-width":{"base":1.3,"stops":[[16,3],[20,7]]}}},{"id":"railway_dashline","metadata":{"mapbox:group":"b6371a3f2f5a9932464fa3867530a2e5"},"paint":{"line-color":"#fafafa","line-width":{"base":1.3,"stops":[[16,2],[20,6]]},"line-dasharray":[3,3]},"type":"line","source":"openmaptiles","source-layer":"transportation","minzoom":13,"filter":["all",["==","$type","LineString"],["all",["!has","service"],["==","class","rail"]]],"layout":{"visibility":"visible","line-join":"round"}},{"id":"highway_motorway_bridge_casing","type":"line","metadata":{"mapbox:group":"b6371a3f2f5a9932464fa3867530a2e5"},"source":"openmaptiles","source-layer":"transportation","minzoom":6,"filter":["all",["==","$type","LineString"],["all",["==","brunnel","bridge"],["==","class","motorway"]]],"layout":{"line-cap":"butt","line-join":"miter","visibility":"visible"},"paint":{"line-color":"rgb(213, 213, 213)","line-width":{"base":1.4,"stops":[[5.8,0],[6,5],[20,45]]},"line-dasharray":[2,0],"line-opacity":1}},{"id":"highway_motorway_bridge_inner","type":"line","metadata":{"mapbox:group":"b6371a3f2f5a9932464fa3867530a2e5"},"source":"openmaptiles","source-layer":"transportation","minzoom":6,"filter":["all",["==","$type","LineString"],["all",["==","brunnel","bridge"],["==","class","motorway"]]],"layout":{"line-cap":"round","line-join":"round","visibility":"visible"},"paint":{"line-color":{"base":1,"stops":[[5.8,"hsla(0, 0%, 85%, 0.53)"],[6,"#fff"]]},"line-width":{"base":1.4,"stops":[[4,2],[6,1.3],[20,30]]}}},{"id":"highway_name_other","type":"symbol","metadata":{"mapbox:group":"b6371a3f2f5a9932464fa3867530a2e5"},"source":"openmaptiles","source-layer":"transportation_name","filter":["all",["!=","class","motorway"],["==","$type","LineString"],["!has","name:en"]],"layout":{"text-size":10,"text-max-angle":30,"text-transform":"uppercase","symbol-spacing":350,"text-font":["Metropolis Regular","Klokantech Noto Sans Regular","Klokantech Noto Sans CJK Regular"],"symbol-placement":"line","visibility":"visible","text-rotation-alignment":"map","text-pitch-alignment":"viewport","text-field":"{name:latin} {name:nonlatin}"},"paint":{"text-color":"#bbb","text-halo-color":"#fff","text-translate":[0,0],"text-halo-width":2,"text-halo-blur":1}},{"id":"highway_name_other-en","type":"symbol","metadata":{"mapbox:group":"b6371a3f2f5a9932464fa3867530a2e5"},"source":"openmaptiles","source-layer":"transportation_name","filter":["all",["!=","class","motorway"],["==","$type","LineString"],["has","name:en"]],"layout":{"text-size":10,"text-max-angle":30,"text-transform":"uppercase","symbol-spacing":350,"text-font":["Metropolis Regular","Klokantech Noto Sans Regular","Klokantech Noto Sans CJK Regular"],"symbol-placement":"line","visibility":"visible","text-rotation-alignment":"map","text-pitch-alignment":"viewport","text-field":"{name:en} {name:nonlatin}"},"paint":{"text-color":"#bbb","text-halo-color":"#fff","text-translate":[0,0],"text-halo-width":2,"text-halo-blur":1}},{"id":"highway_name_motorway","type":"symbol","metadata":{"mapbox:group":"b6371a3f2f5a9932464fa3867530a2e5"},"source":"openmaptiles","source-layer":"transportation_name","filter":["all",["==","$type","LineString"],["==","class","motorway"]],"layout":{"text-size":10,"symbol-spacing":350,"text-font":["Metropolis Light","Klokantech Noto Sans Regular","Klokantech Noto Sans CJK Regular"],"symbol-placement":"line","visibility":"visible","text-rotation-alignment":"viewport","text-pitch-alignment":"viewport","text-field":"{ref}"},"paint":{"text-color":"rgb(117, 129, 145)","text-halo-color":"hsl(0, 0%, 100%)","text-translate":[0,2],"text-halo-width":1,"text-halo-blur":1}},{"id":"boundary_state","type":"line","metadata":{"mapbox:group":"a14c9607bc7954ba1df7205bf660433f"},"source":"openmaptiles","source-layer":"boundary","filter":["==","admin_level",4],"layout":{"line-cap":"round","line-join":"round","visibility":"visible"},"paint":{"line-color":"rgb(230, 204, 207)","line-width":{"base":1.3,"stops":[[3,1],[22,15]]},"line-blur":0.4,"line-dasharray":[2,2],"line-opacity":1}},{"id":"boundary_country","type":"line","metadata":{"mapbox:group":"a14c9607bc7954ba1df7205bf660433f"},"source":"openmaptiles","source-layer":"boundary","filter":["==","admin_level",2],"layout":{"line-cap":"round","line-join":"round"},"paint":{"line-color":"rgb(230, 204, 207)","line-width":{"base":1.1,"stops":[[3,1],[22,20]]},"line-blur":{"base":1,"stops":[[0,0.4],[22,4]]},"line-opacity":1}},{"id":"place_other","type":"symbol","metadata":{"mapbox:group":"101da9f13b64a08fa4b6ac1168e89e5f"},"source":"openmaptiles","source-layer":"place","maxzoom":14,"filter":["all",["!in","class","city","suburb","town","village"],["==","$type","Point"],["!has","name:en"]],"layout":{"text-size":10,"text-transform":"uppercase","text-font":["Metropolis Regular","Klokantech Noto Sans Regular","Klokantech Noto Sans CJK Regular"],"text-justify":"center","visibility":"visible","text-offset":[0.5,0],"text-anchor":"center","text-field":"{name:latin}\n{name:nonlatin}"},"paint":{"text-color":"rgb(117, 129, 145)","text-halo-color":"rgb(242,243,240)","text-halo-width":1,"text-halo-blur":1}},{"id":"place_other-en","type":"symbol","metadata":{"mapbox:group":"101da9f13b64a08fa4b6ac1168e89e5f"},"source":"openmaptiles","source-layer":"place","maxzoom":14,"filter":["all",["!in","class","city","suburb","town","village"],["==","$type","Point"],["has","name:en"]],"layout":{"text-size":10,"text-transform":"uppercase","text-font":["Metropolis Regular","Klokantech Noto Sans Regular","Klokantech Noto Sans CJK Regular"],"text-justify":"center","visibility":"visible","text-offset":[0.5,0],"text-anchor":"center","text-field":"{name:en}\n{name:nonlatin}"},"paint":{"text-color":"rgb(117, 129, 145)","text-halo-color":"rgb(242,243,240)","text-halo-width":1,"text-halo-blur":1}},{"id":"place_suburb","type":"symbol","metadata":{"mapbox:group":"101da9f13b64a08fa4b6ac1168e89e5f"},"source":"openmaptiles","source-layer":"place","maxzoom":15,"filter":["all",["==","$type","Point"],["==","class","suburb"],["!has","name:en"]],"layout":{"text-size":10,"text-transform":"uppercase","text-font":["Metropolis Regular","Klokantech Noto Sans Regular","Klokantech Noto Sans CJK Regular"],"text-justify":"center","visibility":"visible","text-offset":[0.5,0],"text-anchor":"center","text-field":"{name:latin}\n{name:nonlatin}"},"paint":{"text-color":"rgb(117, 129, 145)","text-halo-color":"rgb(242,243,240)","text-halo-width":1,"text-halo-blur":1}},{"id":"place_suburb-en","type":"symbol","metadata":{"mapbox:group":"101da9f13b64a08fa4b6ac1168e89e5f"},"source":"openmaptiles","source-layer":"place","maxzoom":15,"filter":["all",["==","$type","Point"],["==","class","suburb"],["has","name:en"]],"layout":{"text-size":10,"text-transform":"uppercase","text-font":["Metropolis Regular","Klokantech Noto Sans Regular","Klokantech Noto Sans CJK Regular"],"text-justify":"center","visibility":"visible","text-offset":[0.5,0],"text-anchor":"center","text-field":"{name:en}\n{name:nonlatin}"},"paint":{"text-color":"rgb(117, 129, 145)","text-halo-color":"rgb(242,243,240)","text-halo-width":1,"text-halo-blur":1}},{"id":"place_village","type":"symbol","metadata":{"mapbox:group":"101da9f13b64a08fa4b6ac1168e89e5f"},"source":"openmaptiles","source-layer":"place","maxzoom":14,"filter":["all",["==","$type","Point"],["==","class","village"],["!has","name:en"]],"layout":{"text-size":10,"text-transform":"uppercase","text-font":["Metropolis Regular","Klokantech Noto Sans Regular","Klokantech Noto Sans CJK Regular"],"text-justify":"left","visibility":"visible","text-offset":[0.5,0.2],"icon-size":0.4,"text-anchor":"left","text-field":"{name:latin}\n{name:nonlatin}"},"paint":{"text-color":"rgb(117, 129, 145)","text-halo-color":"rgb(242,243,240)","text-halo-width":1,"text-halo-blur":1,"icon-opacity":0.7}},{"id":"place_village-en","type":"symbol","metadata":{"mapbox:group":"101da9f13b64a08fa4b6ac1168e89e5f"},"source":"openmaptiles","source-layer":"place","maxzoom":14,"filter":["all",["==","$type","Point"],["==","class","village"],["has","name:en"]],"layout":{"text-size":10,"text-transform":"uppercase","text-font":["Metropolis Regular","Klokantech Noto Sans Regular","Klokantech Noto Sans CJK Regular"],"text-justify":"left","visibility":"visible","text-offset":[0.5,0.2],"icon-size":0.4,"text-anchor":"left","text-field":"{name:en}\n{name:nonlatin}"},"paint":{"text-color":"rgb(117, 129, 145)","text-halo-color":"rgb(242,243,240)","text-halo-width":1,"text-halo-blur":1,"icon-opacity":0.7}},{"id":"place_town","type":"symbol","metadata":{"mapbox:group":"101da9f13b64a08fa4b6ac1168e89e5f"},"source":"openmaptiles","source-layer":"place","maxzoom":15,"filter":["all",["==","$type","Point"],["==","class","town"],["!has","name:en"]],"layout":{"text-size":10,"icon-image":{"base":1,"stops":[[0,"circle-11"],[8,""]]},"text-transform":"uppercase","text-font":["Metropolis Regular","Klokantech Noto Sans Regular","Klokantech Noto Sans CJK Regular"],"text-justify":"left","visibility":"visible","text-offset":[0.5,0.2],"icon-size":0.4,"text-anchor":{"base":1,"stops":[[0,"left"],[8,"center"]]},"text-field":"{name:latin}\n{name:nonlatin}"},"paint":{"text-color":"rgb(117, 129, 145)","text-halo-color":"rgb(242,243,240)","text-halo-width":1,"text-halo-blur":1,"icon-opacity":0.7}},{"id":"place_town-en","type":"symbol","metadata":{"mapbox:group":"101da9f13b64a08fa4b6ac1168e89e5f"},"source":"openmaptiles","source-layer":"place","maxzoom":15,"filter":["all",["==","$type","Point"],["==","class","town"],["has","name:en"]],"layout":{"text-size":10,"icon-image":{"base":1,"stops":[[0,"circle-11"],[8,""]]},"text-transform":"uppercase","text-font":["Metropolis Regular","Klokantech Noto Sans Regular","Klokantech Noto Sans CJK Regular"],"text-justify":"left","visibility":"visible","text-offset":[0.5,0.2],"icon-size":0.4,"text-anchor":{"base":1,"stops":[[0,"left"],[8,"center"]]},"text-field":"{name:en}\n{name:nonlatin}"},"paint":{"text-color":"rgb(117, 129, 145)","text-halo-color":"rgb(242,243,240)","text-halo-width":1,"text-halo-blur":1,"icon-opacity":0.7}},{"id":"place_city","type":"symbol","metadata":{"mapbox:group":"101da9f13b64a08fa4b6ac1168e89e5f"},"source":"openmaptiles","source-layer":"place","maxzoom":14,"filter":["all",["==","$type","Point"],["all",["!=","capital",2],["==","class","city"],[">","rank",3]],["!has","name:en"]],"layout":{"text-size":10,"icon-image":{"base":1,"stops":[[0,"circle-11"],[8,""]]},"text-transform":"uppercase","text-font":["Metropolis Regular","Klokantech Noto Sans Regular","Klokantech Noto Sans CJK Regular"],"text-justify":"left","visibility":"visible","text-offset":[0.5,0.2],"icon-size":0.4,"text-anchor":{"base":1,"stops":[[0,"left"],[8,"center"]]},"text-field":"{name:latin}\n{name:nonlatin}"},"paint":{"text-color":"rgb(117, 129, 145)","text-halo-color":"rgb(242,243,240)","text-halo-width":1,"text-halo-blur":1,"icon-opacity":0.7}},{"id":"place_city-en","type":"symbol","metadata":{"mapbox:group":"101da9f13b64a08fa4b6ac1168e89e5f"},"source":"openmaptiles","source-layer":"place","maxzoom":14,"filter":["all",["==","$type","Point"],["all",["!=","capital",2],["==","class","city"],[">","rank",3]],["has","name:en"]],"layout":{"text-size":10,"icon-image":{"base":1,"stops":[[0,"circle-11"],[8,""]]},"text-transform":"uppercase","text-font":["Metropolis Regular","Klokantech Noto Sans Regular","Klokantech Noto Sans CJK Regular"],"text-justify":"left","visibility":"visible","text-offset":[0.5,0.2],"icon-size":0.4,"text-anchor":{"base":1,"stops":[[0,"left"],[8,"center"]]},"text-field":"{name:en}\n{name:nonlatin}"},"paint":{"text-color":"rgb(117, 129, 145)","text-halo-color":"rgb(242,243,240)","text-halo-width":1,"text-halo-blur":1,"icon-opacity":0.7}},{"id":"place_capital","type":"symbol","metadata":{"mapbox:group":"101da9f13b64a08fa4b6ac1168e89e5f"},"source":"openmaptiles","source-layer":"place","maxzoom":12,"filter":["all",["==","$type","Point"],["all",["==","capital",2],["==","class","city"]],["!has","name:en"]],"layout":{"text-size":14,"icon-image":{"base":1,"stops":[[0,"star-11"],[8,""]]},"text-transform":"uppercase","text-font":["Metropolis Regular","Klokantech Noto Sans Regular","Klokantech Noto Sans CJK Regular"],"text-justify":"left","visibility":"visible","text-offset":[0.5,0.2],"icon-size":1,"text-anchor":{"base":1,"stops":[[0,"left"],[8,"center"]]},"text-field":"{name:latin}\n{name:nonlatin}"},"paint":{"text-color":"rgb(117, 129, 145)","text-halo-color":"rgb(242,243,240)","text-halo-width":1,"text-halo-blur":1,"icon-opacity":0.7}},{"id":"place_capital-en","type":"symbol","metadata":{"mapbox:group":"101da9f13b64a08fa4b6ac1168e89e5f"},"source":"openmaptiles","source-layer":"place","maxzoom":12,"filter":["all",["==","$type","Point"],["all",["==","capital",2],["==","class","city"]],["has","name:en"]],"layout":{"text-size":14,"icon-image":{"base":1,"stops":[[0,"star-11"],[8,""]]},"text-transform":"uppercase","text-font":["Metropolis Regular","Klokantech Noto Sans Regular","Klokantech Noto Sans CJK Regular"],"text-justify":"left","visibility":"visible","text-offset":[0.5,0.2],"icon-size":1,"text-anchor":{"base":1,"stops":[[0,"left"],[8,"center"]]},"text-field":"{name:en}\n{name:nonlatin}"},"paint":{"text-color":"rgb(117, 129, 145)","text-halo-color":"rgb(242,243,240)","text-halo-width":1,"text-halo-blur":1,"icon-opacity":0.7}},{"id":"place_city_large","type":"symbol","metadata":{"mapbox:group":"101da9f13b64a08fa4b6ac1168e89e5f"},"source":"openmaptiles","source-layer":"place","maxzoom":12,"filter":["all",["==","$type","Point"],["all",["!=","capital",2],["<=","rank",3],["==","class","city"]],["!has","name:en"]],"layout":{"text-size":14,"icon-image":{"base":1,"stops":[[0,"circle-11"],[8,""]]},"text-transform":"uppercase","text-font":["Metropolis Regular","Klokantech Noto Sans Regular","Klokantech Noto Sans CJK Regular"],"text-justify":"left","visibility":"visible","text-offset":[0.5,0.2],"icon-size":0.4,"text-anchor":{"base":1,"stops":[[0,"left"],[8,"center"]]},"text-field":"{name:latin}\n{name:nonlatin}"},"paint":{"text-color":"rgb(117, 129, 145)","text-halo-color":"rgb(242,243,240)","text-halo-width":1,"text-halo-blur":1,"icon-opacity":0.7}},{"id":"place_city_large-en","type":"symbol","metadata":{"mapbox:group":"101da9f13b64a08fa4b6ac1168e89e5f"},"source":"openmaptiles","source-layer":"place","maxzoom":12,"filter":["all",["==","$type","Point"],["all",["!=","capital",2],["<=","rank",3],["==","class","city"]],["has","name:en"]],"layout":{"text-size":14,"icon-image":{"base":1,"stops":[[0,"circle-11"],[8,""]]},"text-transform":"uppercase","text-font":["Metropolis Regular","Klokantech Noto Sans Regular","Klokantech Noto Sans CJK Regular"],"text-justify":"left","visibility":"visible","text-offset":[0.5,0.2],"icon-size":0.4,"text-anchor":{"base":1,"stops":[[0,"left"],[8,"center"]]},"text-field":"{name:en}\n{name:nonlatin}"},"paint":{"text-color":"rgb(117, 129, 145)","text-halo-color":"rgb(242,243,240)","text-halo-width":1,"text-halo-blur":1,"icon-opacity":0.7}},{"id":"place_state","type":"symbol","metadata":{"mapbox:group":"101da9f13b64a08fa4b6ac1168e89e5f"},"source":"openmaptiles","source-layer":"place","maxzoom":12,"filter":["all",["==","$type","Point"],["==","class","state"],["!has","name:en"]],"layout":{"visibility":"visible","text-field":"{name:latin}\n{name:nonlatin}","text-font":["Metropolis Regular","Klokantech Noto Sans Regular","Klokantech Noto Sans CJK Regular"],"text-transform":"uppercase","text-size":10},"paint":{"text-color":"rgb(113, 129, 144)","text-halo-color":"rgb(242,243,240)","text-halo-width":1,"text-halo-blur":1}},{"id":"place_state-en","type":"symbol","metadata":{"mapbox:group":"101da9f13b64a08fa4b6ac1168e89e5f"},"source":"openmaptiles","source-layer":"place","maxzoom":12,"filter":["all",["==","$type","Point"],["==","class","state"],["has","name:en"]],"layout":{"visibility":"visible","text-field":"{name:en}\n{name:nonlatin}","text-font":["Metropolis Regular","Klokantech Noto Sans Regular","Klokantech Noto Sans CJK Regular"],"text-transform":"uppercase","text-size":10},"paint":{"text-color":"rgb(113, 129, 144)","text-halo-color":"rgb(242,243,240)","text-halo-width":1,"text-halo-blur":1}},{"id":"place_country_other","type":"symbol","metadata":{"mapbox:group":"101da9f13b64a08fa4b6ac1168e89e5f"},"source":"openmaptiles","source-layer":"place","maxzoom":8,"filter":["all",["==","$type","Point"],["all",["==","class","country"],[">=","rank",2]],["!has","name:en"]],"layout":{"visibility":"visible","text-field":"{name:latin}\n{name:nonlatin}","text-font":["Metropolis Regular","Klokantech Noto Sans Regular","Klokantech Noto Sans CJK Regular"],"text-transform":"uppercase","text-size":{"base":1,"stops":[[0,10],[6,12]]}},"paint":{"text-halo-width":1.4,"text-halo-color":"rgba(236,236,234,0.7)","text-color":{"base":1,"stops":[[3,"rgb(157,169,177)"],[4,"rgb(153, 153, 153)"]]}}},{"id":"place_country_other-en","type":"symbol","metadata":{"mapbox:group":"101da9f13b64a08fa4b6ac1168e89e5f"},"source":"openmaptiles","source-layer":"place","maxzoom":8,"filter":["all",["==","$type","Point"],["all",["==","class","country"],[">=","rank",2]],["has","name:en"]],"layout":{"visibility":"visible","text-field":"{name:en}\n{name:nonlatin}","text-font":["Metropolis Regular","Klokantech Noto Sans Regular","Klokantech Noto Sans CJK Regular"],"text-transform":"uppercase","text-size":{"base":1,"stops":[[0,10],[6,12]]}},"paint":{"text-halo-width":1.4,"text-halo-color":"rgba(236,236,234,0.7)","text-color":{"base":1,"stops":[[3,"rgb(157,169,177)"],[4,"rgb(153, 153, 153)"]]}}},{"id":"place_country_major","type":"symbol","metadata":{"mapbox:group":"101da9f13b64a08fa4b6ac1168e89e5f"},"source":"openmaptiles","source-layer":"place","maxzoom":6,"filter":["all",["==","$type","Point"],["all",["<=","rank",1],["==","class","country"]],["!has","name:en"]],"layout":{"visibility":"visible","text-field":"{name:latin}\n{name:nonlatin}","text-font":["Metropolis Regular","Klokantech Noto Sans Regular","Klokantech Noto Sans CJK Regular"],"text-transform":"uppercase","text-size":{"base":1.4,"stops":[[0,10],[3,12],[4,14]]},"text-anchor":"center"},"paint":{"text-halo-width":1.4,"text-halo-color":"rgba(236,236,234,0.7)","text-color":{"base":1,"stops":[[3,"rgb(157,169,177)"],[4,"rgb(153, 153, 153)"]]}}},{"id":"place_country_major-en","type":"symbol","metadata":{"mapbox:group":"101da9f13b64a08fa4b6ac1168e89e5f"},"source":"openmaptiles","source-layer":"place","maxzoom":6,"filter":["all",["==","$type","Point"],["all",["<=","rank",1],["==","class","country"]],["has","name:en"]],"layout":{"visibility":"visible","text-field":"{name:en}\n{name:nonlatin}","text-font":["Metropolis Regular","Klokantech Noto Sans Regular","Klokantech Noto Sans CJK Regular"],"text-transform":"uppercase","text-size":{"base":1.4,"stops":[[0,10],[3,12],[4,14]]},"text-anchor":"center"},"paint":{"text-halo-width":1.4,"text-halo-color":"rgba(236,236,234,0.7)","text-color":{"base":1,"stops":[[3,"rgb(157,169,177)"],[4,"rgb(153, 153, 153)"]]}}}]}

},{}]},{},[2]);
