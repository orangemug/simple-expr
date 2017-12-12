function parseNumber(value) {
  // Work out the type
  if(value.match(/^[+-]?[0-9]+$/)) {
    value = parseInt(value, 10);
  }
  else if (value.match(/^[+-]?[0-9]+[.][0-9]+$/)) {
    value = parseFloat(value, 10);
  }
  else {
    throw `'${value}' is invalid number`;
  }

  return value;
}

module.exports = {
  parseNumber
}
