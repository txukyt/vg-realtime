const fs = require('fs');
const protobuf = require('protobufjs');

/**
 * EXAMPLE 1 #
 * ###########
 * 
 * Lee el fichero GTFS_TripUpdates.pb y lo decodifica sacando el resultado por consola.
 * 
 */

fs.readFile('GTFS_TripUpdates.pb', (err, data) => {
  if (err) {
    console.error('Error reading the file:', err);
    return;
  }

  protobuf.load('gtfs-realtime/protobuf/gtfs-realtime.proto', (err, root) => {
    if (err) {
      console.error('Error loading protobuf definition:', err);
      return;
    }

    const FeedMessage = root.lookupType("transit_realtime.FeedMessage");

    const message = FeedMessage.decode(new Uint8Array(data));
    console.log('Decoded message:', message);
  });
});
