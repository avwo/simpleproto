/**
 * 包的格式
 * --------------------------------
 * 1B  |  4B    | length  | 1B
 * 0x2 | length | message | 0x5
 * --------------------------------
 */

// 包头包尾标识符
const PACKET_START = 0x2;
const PACKET_END = 0x5;
const LENGTH_FIELD_LEN = 4;
const MSG_OFFSET = LENGTH_FIELD_LEN + 1;
const MAX_PACKET_LENGTH = 0xffffffff;
const noop = () => {};
const throwOccupiedError = () => {
  throw new Error('The write method is occupied.');
};

class Decoder {
  constructor(stream, onData) {
    this.onData = typeof onData === 'function' ? onData : noop;
    this.write = this.write.bind(this);
    if (stream) {
      stream.on('data', this.write);
      this.write = throwOccupiedError;
    }
  }
  write(data) {
    if (!Buffer.isBuffer(data)) {
      return;
    }
    this.buffer = this.buffer ? Buffer.concat([this.buffer, data]) : data;
    this.expectPacket();
  }
  expectPacket() {
    if (this.parsingHeader) {
      return this.expectHeader();
    }
    const start = this.buffer.indexOf(PACKET_START);
    if (start === -1) {
      return;
    }
    this.buffer = this.buffer.slice(start + 1);
    this.expectHeader();
  }
  expectHeader() {
    this.parsingHeader = true;
    if (this.parsingData) {
      return this.expectData();
    }
    if (this.buffer.length < LENGTH_FIELD_LEN) {
      return;
    }
    this.messageLength = this.buffer.readUInt32BE();
    this.buffer = this.buffer.slice(LENGTH_FIELD_LEN);
    this.expectData();
  }
  expectData() {
    this.parsingData = true;
    if (this.buffer.length < this.messageLength) {
      return;
    }
    this.parsingHeader = false;
    this.parsingData = false;
    const message = this.buffer.slice(0, this.messageLength);
    this.buffer = this.buffer.slice(this.messageLength);
    this.onData(message);
    this.expectPacket();
  }
}

const toBuffer = (data) => {
  if (Buffer.isBuffer(data)) {
    return data;
  }
  if (data == null) {
    data = '';
  } else if (typeof data !== 'string') {
    data = JSON.stringify(data);
  }
  return Buffer.from(data);
};

const encode = (data) => {
  data = toBuffer(data);
  const { length } = data;
  if (length > MAX_PACKET_LENGTH) {
    throw new Error(`The message length exceeds ${MAX_PACKET_LENGTH}.`);
  }
  const totalLen = length + LENGTH_FIELD_LEN + 2;
  const result = Buffer.allocUnsafe(totalLen);
  result[0] = PACKET_START;
  result.writeUInt32BE(length, 1);
  if (length) {
    result.fill(data, MSG_OFFSET);
  }
  result[totalLen - 1] = PACKET_END;
  return result;
};

const decode = (stream, cb) => {
  return new Decoder(stream, cb);
};

exports.Decoder = Decoder;
exports.encode = encode;
exports.decode = decode;
