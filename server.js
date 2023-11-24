const express = require('express');
const multer = require('multer');
const xml2js = require('xml2js');
//const AWS = require("aws-sdk");
//const s3 = new AWS.S3()

const app = express();
const port = 3001;

// Set up middleware for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const fs = require('fs');

// Serve HTML form for file upload
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Handle file upload and process XML
app.post('/upload', upload.single('xmlFile'), (req, res) => {
    // 2D array to store componentType and component values
    const componentArray = [];

    // Variables to store componentType and component values
    let componentType = '';
    let components = [];

    const xmlData = req.file.buffer.toString();
    console.log(xmlData);
    // Process XML (you can customize this part based on your requirements)
    xml2js.parseString(xmlData, (err, result) => {
        if (err) {
            console.log('err 1 => '+err);
            return res.status(500).send('Error parsing XML');
        }

        // Format data as needed (customize this part based on your requirements)
        const xmlString = JSON.stringify(result, null, 2);
        const lines = xmlData.split('\n');
        lines.forEach((line) => {
            //console.log('Inside Lines '+line);
            // Check for lines containing "<types>"
            if (line.includes('<types>')) {
                //console.log('Found Types');
                // If <types> element is found, reset the components array
                components = [];
            } else if (line.includes('<name>')) {
                // Extract the value between the elements
                componentType = line.replace(/.*<(.*)>(.*)<\/.*>/, '$2').replace(/ *\/ */g, '/');
                //console.log('FOund Name');
            } else if (line.includes('<members>')) {
              // Extract the value between the elements
                const component = line.replace(/.*<(.*)>(.*)<\/.*>/, '$2').replace(/ *\/ */g, '/');
                //console.log('Found component');
                // Add the value to the components array
                components.push(component);                
            } else if (line.includes('</types>')) {
              // If </types> element is found, add the collected components to the main array
              if (componentType && components.length > 0) {
                componentArray.push({ componentType, components });
              }
            }
          });
          var outputformattedText='';
          componentArray.forEach((type) => {
            // console.log(`<name>${type.componentType}</name>`);
             type.components.forEach((member) => {
               //console.log(`${type.componentType}/${member}`);
               outputformattedText=outputformattedText+`${type.componentType}/${member}\n`;
             });
           });





           const currentDateTime = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
           const fileName = `copadoformat_${currentDateTime}.txt`;
           const filePath = `public/${fileName}`;


           /*await s3.putObject({
            Body: outputformattedText,
            Bucket: "cyclic-wide-eyed-puce-mackerel-ap-southeast-2",
            Key: ${filePath},
        }).promise()*/
   
           /*fs.writeFile(filePath, outputformattedText, (err) => {
            console.log('Inside writeFile');
               if (err) {
                console.log('err 2 => '+err);
                   return res.status(500).send('Error writing text file');
               }
   
               res.download(filePath, fileName, (err) => {
                console.log('Inside Res.Download');
                   if (err) {
                       return res.status(500).send('Error downloading file');
                   }
   
                   // Clean up: delete the temporary text file after download
                   fs.unlink(filePath, (err) => {
                       if (err) {
                           console.error('Error deleting file:', err);
                       }
                   });
               });
            });*/

        // Send the formatted text as response
        res.setHeader('Content-Type', 'text/plain');
        res.send(outputformattedText);
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
