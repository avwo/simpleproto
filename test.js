const assert = require('assert');
const EventEmitter = require('events');
const { encode, decode, Decoder } = require('./');

const VALUE = 'test';

describe('simpleproto', () => {
  it('#encode', () => {
    const decoder = new Decoder();
    decoder.onData = (data) => {
      assert(`${data}` === VALUE);
    };
    decoder.write(encode(VALUE));
  });
  it('#stream', () => {
    const stream = new EventEmitter();
    let count = 0;
    decode(stream, (data) => {
      assert(`${data}` === VALUE);
      ++count;
    });
    stream.emit('data', encode(VALUE));
    stream.emit('data', encode(VALUE));
    stream.emit('data', encode(VALUE));
    assert(count === 3);
  });
});
