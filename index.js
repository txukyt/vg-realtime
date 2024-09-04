const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const protobuf = require('protobufjs');

const app = express();
const port = 3000;

// Configura las rutas a los archivos del certificado
const certPath = path.join(__dirname, 'path/to/dwildcard.vitoria-gasteiz.org.pem.crt');
const keyPath = path.join(__dirname, 'path/to/dwildcard.vitoria-gasteiz.org-rsa.key');
const caCertPath = path.join(__dirname, 'path/to/chainSubordRaizIzenpe.cer');

// Cargar el archivo .proto
protobuf.load('path/to/gtfs-realtime.proto', (err, root) => {
  if (err) {
    console.error('Error loading protobuf definition:', err);
    process.exit(1);
  }

  // Define el tipo de mensaje
  const FeedMessage = root.lookupType('transit_realtime.FeedMessage');

  // Función para duplicar departure a arrival
  function duplicateDepartureToArrival(feedMessage) {

    console.log('hola');

    feedMessage.entity.forEach(entity => {
        console.log(entity);
      if (entity.tripUpdate) {
        entity.tripUpdate.stopTimeUpdate.forEach(stopTimeUpdate => {


          if (stopTimeUpdate.departure) {
            // Asegurarse de que arrival existe
            if (!stopTimeUpdate.arrival) {
              stopTimeUpdate.arrival = {};
            }
            // Duplica departure a arrival
            stopTimeUpdate.arrival.time = stopTimeUpdate.departure.time;
            stopTimeUpdate.arrival.delay = stopTimeUpdate.departure.delay;
            stopTimeUpdate.arrival.uncertainty = stopTimeUpdate.departure.uncertainty;
          }
        });
      }
    });
  }

  // Ruta para obtener actualizaciones
  app.get('/updates', (req, res) => {
    // Configurar el agente HTTPS con certificado
    const agent = new https.Agent({
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath),
      ca: fs.readFileSync(caCertPath), // Certificado CA
      rejectUnauthorized: true // Validar el certificado del servidor
    });

    // URL de datos
    const DATA_URL = 'https://dwww.vitoria-gasteiz.org/we001/http/vgTransit/realTime/tripUpdates.pb';

    // Hacer la solicitud HTTPS
    https.get(DATA_URL, { agent }, (response) => {
      let data = [];

      // Manejar los datos recibidos
      response.on('data', (chunk) => {
        data.push(chunk);
      });

      // Manejar el final de la respuesta
      response.on('end', () => {
        try {
          // Unir los datos en un solo buffer
          const buffer = Buffer.concat(data);

          // Decodificar los datos
          const decoded = FeedMessage.decode(new Uint8Array(buffer));

          // Opcional: convertir a un objeto JavaScript para manipulación
          const object = FeedMessage.toObject(decoded, {
            longs: String,
            enums: String,
            bytes: String,
          });

          // Imprimir la estructura del objeto decodificado para depuración
          //console.log('Decoded object:', JSON.stringify(object, null, 2));

          // Duplica departure a arrival
          duplicateDepartureToArrival(object);

         // Volver a codificar el objeto modificado
         const updatedBuffer = FeedMessage.encode(FeedMessage.fromObject(object)).finish();

         // Configurar el encabezado de respuesta para indicar el tipo de archivo
         res.setHeader('Content-Type', 'application/x-protobuf');
         res.setHeader('Content-Disposition', 'attachment; filename="updated_tripUpdates.pb"');

         // Enviar el buffer codificado como respuesta
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

  // Iniciar el servidor
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
});
