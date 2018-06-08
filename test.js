const { EventEmitter } = require('events');
const { Readable } = require('stream');
const { it } = require('mocha');
const chai = require('chai');
const { createGuacamoleClient, parseMessage, createMessage, parseStream } = require('./index');

const expect = chai.expect;

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
	const readable = new EventEmitter;
	const messages = [ ];
	parseStream(readable,  (e, message) => {
		expect(e).to.deep.equal(null);
		messages.push(message);
	});
	readable.emit('data', Buffer.from('1.s,2'));
	readable.emit('data', Buffer.from('.ef;3.'));
	readable.emit('data', Buffer.from('c.s,5.axcvb;'));
	readable.emit('data', Buffer.from('3.dfg;3.gxx'));

	expect(messages).deep.equal([
		[ 's', 'ef' ],
		[ 'c.s', 'axcvb' ],
		[ 'dfg' ]
	]);
});

it('fires error and continues parsing', function() {
	const readable = new EventEmitter;
	const messages = [ ];
	var correctErrorFired = 0;
	parseStream(readable,  (e, message) => {
		if(e) {
			expect(e.message).to.equal('Invalid token length: b;3');
			correctErrorFired++;
		} else {
			messages.push(message);
		}
	});

	readable.emit('data', Buffer.from('1.s,2'));
	readable.emit('data', Buffer.from('.ef;3.'));
	readable.emit('data', Buffer.from('c.s,5.asxdcvb;'));
	readable.emit('data', Buffer.from('3.dfg;3.gxx'));
	readable.emit('data', Buffer.from('6.A!Fy5=;0.;'));

	expect(messages).deep.equal([
		[ 's', 'ef' ],
		[ 'A!Fy5=' ],
		[ '' ]
	]);

	expect(correctErrorFired).to.deep.equal(1);
});

it('parses stream and then stops', function() {
	const readable = new EventEmitter;
	const messages = [ ];
	const stop = parseStream(readable,  (e, message) => {
		expect(e).to.deep.equal(null);
		messages.push(message);
	});
	readable.emit('data', Buffer.from('1.s,2'));
	readable.emit('data', Buffer.from('.ef;3.'));
	readable.emit('data', Buffer.from('c.s,5.axcvb;'));
	stop();
	readable.emit('data', Buffer.from('3.dfg;3.gxx'));

	expect(messages).deep.equal([
		[ 's', 'ef' ],
		[ 'c.s', 'axcvb' ]
	]);
});

