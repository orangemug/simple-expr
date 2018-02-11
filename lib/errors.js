class ParseError extends Error {
  constructor(message, opts={}) {
    super(message);
    this.line = opts.token.row;
    this.column = opts.token.col;
  }
}


module.exports = {
  ParseError
}
