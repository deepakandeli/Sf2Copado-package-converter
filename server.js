const express = require('express');
const multer = require('multer');
const xml2js = require('xml2js');
const AWS = require('aws-sdk');


const app = express();
const port = 3001;

// Set up middleware for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Serve HTML form for file upload
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Configure AWS SDK with your credentials
/*AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
});*/

// Create an S3 instance
const s3 = new AWS.S3();

// Handle file upload and process XML
app.post('/upload', upload.single('xmlFile'), (req, res) => {
    // 2D array to store componentType and component values
    const componentArray = [];

    // Variables to store componentType and component values
    let componentType = '';
    let components = [];

    const xmlData = req.file.buffer.toString();

    // Process XML (customize this part based on your requirements)
    xml2js.parseString(xmlData, (err, result) => {
        if (err) {
            console.log('Error parsing XML:', err);
            return res.status(500).send('Error parsing XML');
        }

        // Format data as needed (customize this part based on your requirements)
        const xmlString = JSON.stringify(result, null, 2);
        const lines = xmlData.split('\n');
        lines.forEach((line) => {
            if (line.includes('<types>')) {
                components = [];
            } else if (line.includes('<name>')) {
                componentType = line.replace(/.*<(.*)>(.*)<\/.*>/, '$2').replace(/ *\/ */g, '/');
            } else if (line.includes('<members>')) {
                const component = line.replace(/.*<(.*)>(.*)<\/.*>/, '$2').replace(/ *\/ */g, '/');
                components.push(component);
            } else if (line.includes('</types>')) {
                if (componentType && components.length > 0) {
                    componentArray.push({ componentType, components });
                }
            }
        });

        let outputformattedText = '';
        componentArray.forEach((type) => {
            type.components.forEach((member) => {
                outputformattedText += `${type.componentType}/${member}\n`;
            });
        });

        // If running on the actual server, upload to S3
        if (process.env.NODE_ENV === 'production') {
            const currentDateTime = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
            const fileName = `copadoformat_${currentDateTime}.txt`;

            s3.putObject({
                Body: outputformattedText,
                Bucket: 'cyclic-wide-eyed-puce-mackerel-ap-southeast-2',
                Key: fileName,
            }, (s3Error) => {
                if (s3Error) {
                    console.log('Error uploading to S3:', s3Error);
                    return res.status(500).send('Error uploading to S3');
                }

                // Send success response with the S3 file key
                // Download and delete the file directly without redirecting
                const downloadUrl = s3.getSignedUrl('getObject', {
                    Bucket: 'cyclic-wide-eyed-puce-mackerel-ap-southeast-2',
                    Key: fileName,
                    Expires: 60, // URL expires in 60 seconds
                });
                console.log('downloadUrl 1 '+downloadUrl);
                var downloadUrlSub = downloadUrl.substring(downloadUrl.indexOf('https:'));
                console.log('downloadUrl 2 '+downloadUrlSub);
               // Download the file
                res.download(downloadUrlSub, fileName, (err) => {
                    if (err) {
                        console.log('err => '+err);
                        return res.status(500).send('Error downloading file');
                    }
                });
                // Send success response
                //res.status(200).send(outputformattedText);
            });
        } else {
            // If running locally, write to a local file
            const currentDateTime = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
            const fileName = `copadoformat_${currentDateTime}.txt`;
            const filePath = `public/${fileName}`;

            // Write to local file
            require('fs').writeFile(filePath, outputformattedText, (err) => {
                if (err) {
                    console.log('err 2 => '+err);
                    console.log('Error writing local file:', err);
                    return res.status(500).send('Error writing local file');
                }

                res.download(filePath, fileName, (err) => {
                    console.log('Inside Res.Download');
                        if (err) {
                            return res.status(500).send('Error downloading file');
                        }
        
                        // Clean up: delete the temporary text file after download
                        require('fs').unlink(filePath, (err) => {
                            if (err) {
                                console.error('Error deleting file:', err);
                            }
                        });
                    });
                // Send success response with the file path
                //res.status(200).send(outputformattedText);
            });
        }
    });
});



// Start the server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
