const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const protobuf = require('protobufjs');

const app = express();
const port = process.env.PORT || 8080;

protobuf.load('gtfs-realtime/protobuf/gtfs-realtime.proto', (err, root) => {
  if (err) {
    console.error('Error loading protobuf definition:', err);
    process.exit(1);
  }

  const FeedMessage = root.lookupType('transit_realtime.FeedMessage');

  function duplicateDepartureToArrival(feedMessage) {
    feedMessage.entity.forEach(entity => {
        console.log(entity);
      if (entity.tripUpdate) {
        entity.tripUpdate.stopTimeUpdate.forEach(stopTimeUpdate => {

          if (stopTimeUpdate.departure) {
            if (!stopTimeUpdate.arrival) {
              stopTimeUpdate.arrival = {};
            }
            stopTimeUpdate.arrival.time = stopTimeUpdate.departure.time;
            stopTimeUpdate.arrival.delay = stopTimeUpdate.departure.delay;
            stopTimeUpdate.arrival.uncertainty = stopTimeUpdate.departure.uncertainty;
          }
        });
      }
    });
  }

  app.get('/updates', (req, res) => {
    const agent = new https.Agent({
      rejectUnauthorized: false
    });

    const DATA_URL = 'https://www.vitoria-gasteiz.org/we001/http/vgTransit/realTime/tripUpdates.pb';

    https.get(DATA_URL, { agent }, (response) => {
      let data = [];

      response.on('data', (chunk) => {
        data.push(chunk);
      });

      response.on('end', () => {
        try {
          const buffer = Buffer.concat(data);
          const decoded = FeedMessage.decode(new Uint8Array(buffer));
          const object = FeedMessage.toObject(decoded, {
            longs: String,
            enums: String,
            bytes: String,
          });

        duplicateDepartureToArrival(object);

         const updatedBuffer = FeedMessage.encode(FeedMessage.fromObject(object)).finish();

         res.setHeader('Content-Type', 'application/octet-stream');
         res.setHeader('Content-Disposition', 'attachment; filename="tripUpdates.pb"');

         res.send(updatedBuffer);
        } catch (error) {
          console.error('Error decoding the response:', error);
          res.status(500).send('Error decoding the response');
        }
      });

    }).on('error', (error) => {
      console.error('Error fetching updates:', error);
      res.status(500).send('Error fetching updates');
    });
  });

  app.listen(port, () => {
    console.log(`Server is running`);
  });
});
