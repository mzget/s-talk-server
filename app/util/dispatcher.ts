const crc = require('crc');

const dispatch = function (uid, connectors) {
	var index = Math.abs(crc.crc32(uid)) % connectors.length;
	return connectors[index];
};

export default dispatch;