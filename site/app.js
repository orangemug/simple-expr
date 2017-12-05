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




