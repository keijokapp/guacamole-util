'use strict';

const tokenLengthRegex = /^[0-9]{1,8}$/; // Assume maximum token length 10^8-1 on base 10

function parseMessage(message) {
	var index = 0;
	const messageLength = message.length;
	const command = [];

	while(1) { // one cycle for each token in message

		const periodIndex = message.indexOf('.', index);

		if(periodIndex == -1) {
			throw new Error('Expected to find a dot');
		}

		const tokenLengthToken = message.slice(index, periodIndex).toString();
		if(!tokenLengthRegex.test(tokenLengthToken)) {
			throw new Error('Invalid token length: ' + buffer);
		}

		const tokenLength = ~~tokenLengthToken;

		if(messageLength - periodIndex - 1 < tokenLength) {
			throw new Error('Unexpected end of message');
		}

		const content = message.slice(periodIndex + 1, periodIndex + 1 + tokenLength);
		command.push(content);

		index = periodIndex + 1 + tokenLength;

		if(message[index] === ';') {
			break;
		}

		if(message[index] !== ',') {
			throw new Error('Expected token delimiter or end of message marker');
		}

		index++;
	}

	if(index + 1 < messageLength) {
		throw new Error('Expected end of message');
	}

	return command;
}

function createMessage(tokens) {
	const messageTokens = [];
	for(let token of tokens) {
		token = String(token);
		messageTokens.push(token.length + '.' + token);
	}
	return messageTokens.join(',') + ';';
}

function parseStream(readable, callback) {

	function dataCallback(data) {
		try {
			for(let i = 0; i < data.length;) {
				i = parse(data, i);
			}
		} catch(e) {
			callback(e);
			// reset state but continue; might not be the best way to deal with it
			tokenLength = null;
			buffer = '';
			command = [];
		}
	}

	readable.on('data', dataCallback);

	var tokenLength = null;
	var buffer = '';
	var command = [];

	function parse(data, index) {
		if(tokenLength === null) {
			// expect length of next token (command or argument) and trailing period
			const periodIndex = data.indexOf('.', index);
			if(periodIndex > -1) {
				buffer += data.slice(index, periodIndex).toString();
				tokenLength = parseInt(buffer) + 1; // Include trailing comma or semicolon
				if(isNaN(tokenLength)) {
					throw new Error('Invalid token length: ' + buffer);
				}
				buffer = '';
				return periodIndex + 1;
			} else {
				buffer += data.slice(index).toString();
				return data.length;
			}
		} else {
			// expect token (command or argument) and trailing comma or semicolon
			const neededDataLength = tokenLength - buffer.length;
			if(neededDataLength <= data.length - index) {
				const endIndex = index + neededDataLength;
				buffer += data.slice(index, endIndex).toString();
				parseToken(buffer);
				buffer = '';
				tokenLength = null;
				return endIndex;
			} else {
				buffer += data.slice(index).toString();
				return data.length;
			}
		}
	}

	function parseToken(token) {
		const lastCharacter = token[token.length - 1];
		token = token.slice(0, -1);
		command.push(token);
		if(lastCharacter === ';') {
			callback(null, command);
			command = [];
		}
	}

	return function stop() {
		readable.removeListener('data', dataCallback);
	};
}

module.exports = {
	parseMessage: parseMessage,
	createMessage: createMessage,
	parseStream: parseStream
};
