const fs = require('fs');
const protobuf = require('protobufjs');

// Leer el archivo binario
fs.readFile('GTFS_TripUpdates.pb', (err, data) => {
  if (err) {
    console.error('Error reading the file:', err);
    return;
  }

  // Cargar el archivo protobuf
  protobuf.load('path/to/gtfs-realtime.proto', (err, root) => {
    if (err) {
      console.error('Error loading protobuf definition:', err);
      return;
    }

    // Obtener el tipo de mensaje
    const FeedMessage = root.lookupType("transit_realtime.FeedMessage");

    // Decodificar el mensaje
    const message = FeedMessage.decode(new Uint8Array(data));
    console.log('Decoded message:', message);
  });
});
