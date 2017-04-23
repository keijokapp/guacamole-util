const { EventEmitter } = require('events');
const { Readable } = require('stream');
const { it } = require('mocha');
const spies = require('chai-spies');
const chai = require('chai');
const { createGuacamoleClient, parseMessage, createMessage, parseStream } = require('./index');

chai.use(spies);
const expect = chai.expect;
const spy = chai.spy;

it('should parse message', () => {
	expect(parseMessage('0.;')).to.deep.equal(['']);
	expect(parseMessage('0.,4."[2#;')).to.deep.equal(['','"[2#']);
	expect(parseMessage('8.@#$%6.)),5."[2#!,0.;')).to.deep.equal(['@#$%6.))','"[2#!', '']);
});

it('create message', () => {
	expect(createMessage([])).to.equal(';'); // is not really valid message but should work anyway
	expect(createMessage([''])).to.equal('0.;');
	expect(createMessage(['fuck'])).to.equal('4.fuck;');
	expect(createMessage([']AL4L3{D', '', 'L:V1;ZPG', ''])).to.equal('8.]AL4L3{D,0.,8.L:V1;ZPG,0.;');
});

it('parses stream', function() {
	const readable = new Readable;
	var streamParser = parseStream(readable);
	var messages = [ ];
	streamParser.on('message', message => {
		messages.push(message);
	});
	readable.emit('data', Buffer('1.s,2'));
	readable.emit('data', Buffer('.ef;3.'));
	readable.emit('data', Buffer('c.s,5.axcvb;'));
	readable.emit('data', Buffer('3.dfg;3.gxx'));

	expect(messages).deep.equal([
		[ 's', 'ef' ],
		[ 'c.s', 'axcvb' ],
		[ 'dfg' ]
	]);
});

it('fires error and continues parsing', function() {
	const readable = new Readable;
	var streamParser = parseStream(readable);
	var messages = [ ];
	streamParser.on('message', message => {
		messages.push(message);
	});

	var errorSpy = spy(function(e) {
		expect(e.message).to.equal('Invalid token length: b;3');
	});
	streamParser.on('error', errorSpy);

	readable.emit('data', Buffer('1.s,2'));
	readable.emit('data', Buffer('.ef;3.'));
	readable.emit('data', Buffer('c.s,5.asxdcvb;'));
	readable.emit('data', Buffer('3.dfg;3.gxx'));
	readable.emit('data', Buffer('6.A!Fy5=;0.;'));

	expect(messages).deep.equal([
		[ 's', 'ef' ],
		[ 'A!Fy5=' ],
		[ '' ]
	]);

	expect(errorSpy).to.have.been.called.once();
});
