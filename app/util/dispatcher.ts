const crc = require("crc");

const dispatch =  (uid, connectors) => {
  const index = Math.abs(crc.crc32(uid)) % connectors.length;
  return connectors[index];
};

export default dispatch;
