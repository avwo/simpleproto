# simpleproto
[![NPM version](https://img.shields.io/npm/v/simpleproto.svg?style=flat-square)](https://npmjs.org/package/simpleproto)
[![node version](https://img.shields.io/badge/node.js-%3E=_6.0-green.svg?style=flat-square)](http://nodejs.org/download/)
[![build status](https://img.shields.io/travis/avwo/simpleproto.svg?style=flat-square)](https://travis-ci.org/avwo/simpleproto)
[![Test coverage](https://codecov.io/gh/avwo/simpleproto/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/avwo/simpleproto)
[![License](https://img.shields.io/npm/l/simpleproto.svg?style=flat-square)](https://www.npmjs.com/package/simpleproto)

在Socket(TCP)连接中传输数据，如果不对数据包做特殊处理，可能出现如下所谓的粘包、拆包的问题：
``` js
// 发送方发送一个数据
sender.write(data);

// 接收方通过以下方式接收的数据和发送的不一致
receiver.on('data', (data) => {
	console.log(data);
})

```
simpleproto通过对传输及接收的数据简单组包及解包解决上述问题：
```
// 发送方
const { encode } = require('simpleproto');
/**
 * 包的格式
 * --------------------------------
 * 1B  |  4B    | length  | 1B
 * 0x2 | length | message | 0x5
 * --------------------------------
 */
sender.write(encode(data));

// 接收方
const { decode } = require('simpleproto'); 

decode(receiver, (data) => {
	// 获取发送过来的数据的buffer对象
	console.log(data);
});

```
# 安装

	npm i --save simpleproto

# 使用

启动一个socket server服务：
```js
// server.js
const net = require('net');
const { encode, decode } = require('simpleproto');

const noop = _ => _;
const server = net.createServer((socket) => {
		socket.on('error', noop);
		decode(socket, (data) => {
			data = `${data}`;
			console.log('Server receive data length:', data.length);
			socket.write(encode(data));
		});
  });
server.listen(9999, () => {
	console.log(`server listening on ${server.address().port}.`);
});
```
客户端代码：
> 为方便查看内部数据包传输请求，采用[socketx](https://github.com/avwo/socketx)将请求代理到本地[whistle](https://github.com/avwo/whistle)

``` js
const { connect } = require('socketx');
const { encode, decode } = require('simpleproto');

(async () => {
	const proxy = {
		host: '127.0.0.1',
		port: 8899,
	};
	const client = await connect({
		host: '127.0.0.1',
		port: 9999,
		proxy,
	});
	decode(client, (data) => {
		console.log('Client receive data length:', `${data}`.length);
	});
	client.on('error', (e) => console.error(e));
	setInterval(() => {
		const data = 'test123456'.repeat(1024 * 3);
		console.log('send data length:', data.length);
		client.write(encode(data));
	}, 3000);
})();
```
![运行结果](https://user-images.githubusercontent.com/11450939/47899816-bad88900-deb5-11e8-9ebc-e29675422aee.png)
![whistle抓包](https://user-images.githubusercontent.com/11450939/47899797-aeecc700-deb5-11e8-97f9-48a19022d416.png)

从运行结果及whistle抓包可以看成，客户端发送30k数据后，socket连接虽然把这些数据拆成几个包，而通过 `simpleproto` 在客户端及服务端都可以正确的获取完整的数据包。

# API
``` js
const { encode, decode, Decoder } = require('simpleproto');
```

1. `encode(data)`：对数据进行组包，data可以为buffer、string、object
2. `decode(stream, cb)`：stream为数据流(socket、文件流等)，每次接收到新的数据包都会触发cb(data)
3. `new Decoder([stream[, cb]])`：解包类对象，构造方法可以传人 `stream` 和 `cb` ，功能同 `decode(stream, cb)`；也可以用于解包非数据流的字节码：

``` js
const decoder = new Decoder();
decoder.onData = (data) => {
	console.log(data);
};
decoder.write(buf);
```
