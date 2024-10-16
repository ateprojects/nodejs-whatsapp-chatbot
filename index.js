const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const fetch = require('node-fetch');
const FormData = require('form-data');
const config = require('./config.js');

process.on('unhandledRejection', err => {
    console.log(err)
});

const COMMANDS = {  // bot commands
    2: 'Simple text message',
     3: 'Simple text message',
     4: 'Simple text message',
    IMAGE: 'Send image',
    DOCUMENT: 'Send document',
    VIDEO: 'Send video',
    CONTACT: 'Send contact',
    1: 'Send product',
}

const FILES = { // file path
    IMAGE: './files/file_example_JPG_100kB.jpg',
    DOCUMENT: './files/file-example_PDF_500_kB.pdf',
    VIDEO: './files/file_example_MP4_480_1_5MG.mp4',
    VCARD: './files/sample-vcard.txt'
}

/**
 * Send request to Whapi.Cloud
 * @param endpoint - endpoint path
 * @param params - request body
 * @param method - GET, POST, PATCH, DELETE
 * @returns {Promise<object>}
 */
async function sendWhapiRequest(endpoint, params= {}, method = 'POST') { // send request to endpoint with params, with POST by default
    let options = {
        method: method,
        headers: {
            Authorization: `Bearer ${config.token}`
        },
    };
    if (!params.media) options.headers['Content-Type'] = 'application/json'; // if in params media is null - set json in headers
    let url = `${config.apiUrl}/${endpoint}`;
    if(params && Object.keys(params).length > 0) {
        if(method === 'GET')
            url += '?' + new URLSearchParams(params); // if GET method set in params, then params move to query
        else
            options.body = params?.media ? toFormData(params) : JSON.stringify(params); // if in params media - transform to formData, else - json
    }
    const response = await fetch(url, options); // send request
    let json = await response.json();
    console.log('Whapi response:', JSON.stringify(json, null, 2));
    return json;
}

/**
 * Convert object to FormData
 * @param obj
 * @returns {FormData}
 */
function toFormData(obj) {
    const form = new FormData();
    for (let key in obj) {
        form.append(key, obj[key]);
    }
    return form;
}

async function setHook() {  // request for set hook and recieve messages
    if (config.botUrl) {
        /** type {import('./whapi').Settings} */
        const settings = {
            webhooks: [
                {
                    url: config.botUrl,
                    events: [
                        // default event for getting messages
                        {type: "messages", method: "post"}
                    ],
                    mode: "method"
                }
            ]
        }
        await sendWhapiRequest('settings', settings, 'PATCH');
    }
}

async function handleNewMessages(req, res){ // handle messages
    try {
        /** type {import('./whapi').Message[]} */
        const messages = req?.body?.messages;
        for (let message of messages) {
            if (message.from_me) continue;
            /** type {import('./whapi').Sender} */
            const sender = {
                to: message.chat_id
            }
            let endpoint = 'messages/text';
            const command = Object.keys(COMMANDS)[+message.text?.body?.trim() - 1];

            switch (command) { // depending on the command, perform an action
                case '2': {
                    sender.body = 'Perfecto, hemos recibido tu solicitud. En breve recibirás una respuesta o actualización. Si tienes alguna otra duda, no dudes en preguntar. 😊
';
                    break;
                }

       switch (command) { // depending on the command, perform an action
                case '3': {
                    sender.body = 'Nuestros horarios de atención son los siguientes:

📅 **Lunes a Viernes:** 9:00 AM - 10:00 PM
📅 **Sábado:** 10:00 AM - 10:00 PM
📅 **Domingo:** Disponible las 24 horas

Si necesitas ayuda dentro de estos horarios, estaremos encantados de atenderte. 😊
';
                    break;
                }

       switch (command) { // depending on the command, perform an action
                case '4': {
                    sender.body = '🚀 **¡Bienvenido a Lunar Hosting!** 🌕

Para iniciar el proceso, por favor, proporciona los siguientes datos:

1. **Nombre:** 
2. **Apellido:** 
3. **Correo electrónico:** 
4. **Número de teléfono:**

Ahora, algunas preguntas rápidas:

5. ¿Tienes hosting de terceros?  
   - **Sí** / **No**

6. ¿Te gustaría agregar **Energía Lunar** a tu plan de hosting?  
   - **Sí** / **No**

7. ¿Ya tienes un dominio registrado o necesitas comprar uno?  
   - **Ya tengo un dominio** / **Necesito comprar uno**

8. ¿Tienes un sitio web **WordPress** activo ahora?  
   - **Sí** / **No**

Tus datos serán almacenados según nuestra **Política de Privacidad** y nuestros **Términos y Condiciones**. Puedes revisarlos aquí: [ate.com.gt/pos](http://ate.com.gt/pos) 🔐

Por favor, responde con los datos y opciones para continuar. ¡Gracias! 🌟
';
                    break;
                }

               
                case 'IMAGE': {
                    sender.caption = 'Text under the photo.';
                    sender.media = fs.createReadStream(FILES.IMAGE); // read file
                    endpoint = 'messages/image';
                    break;
                }
                case 'DOCUMENT': {
                    sender.caption = 'Text under the document.';
                    sender.media = fs.createReadStream(FILES.DOCUMENT);
                    endpoint = 'messages/document';
                    break;
                }
                case 'VIDEO': {
                    sender.caption = 'Text under the video.';
                    sender.media = fs.createReadStream(FILES.VIDEO);
                    endpoint = 'messages/video';
                    break;
                }
      
                
                case '1': {
                    /* you can get real product id using endpoint  https://whapi.readme.io/reference/getproducts */
                    endpoint = `business/products/${config.product}`;
                    break;
                }
               
                
                default: {  // if command not found - set text message with commands
                    sender.body = '¡Hola! 🤖 Soy el asistente virtual de Luna. Estoy aquí para ayudarte. ¿En qué puedo asistirte hoy?

1. Información de productos
2. Soporte técnico
3. Horarios de atención
4. Solicitar Hosting Lunar
  \n\n' +
                        Object.values(COMMANDS).map((text, i) => `${i + 1}. ${text}`).join('\n');
                }
            }
            await sendWhapiRequest(endpoint, sender); // send request
        }
        res.send('Ok');
    } catch (e) {
        res.send(e.message);
    }
}

// Create a new instance of express
const app = express();
app.use(bodyParser.json());

app.get('/', function (req, res) {
    res.send('Bot is running');
});

app.post('/hook/messages', handleNewMessages); // route for get messages

setHook().then(() => {
    const port = config.port || (config.botUrl.indexOf('https:') === 0 ? 443 : 80) // if port not set - set port 443 (if https) or 80 (if http)
    app.listen(port, function () {
        console.log(`Listening on port ${port}...`);
    });
});

