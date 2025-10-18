// functions/index.js
// Implementación de la función de la nube para procesar solicitudes y enviar correos.

const functions = require("firebase-functions");
const nodemailer = require('nodemailer');
const cors = require('cors')({ origin: true });
const logger = functions.logger;

// 🚨🚨 CONFIGURACIÓN DE CORREO 🚨🚨
// Reemplaza con tus credenciales SMTP.
// Recomiendo usar una 'Contraseña de Aplicación' (App Password) si usas Gmail/Outlook.
const USER_EMAIL = 'adc.030328@gmail.com';       // <-- ¡REEMPLAZAR!
const APP_PASSWORD = 'bkyycczcbgsvbbbx';   // <-- ¡REEMPLAZAR!

// Configura el transportador de Nodemailer (usando SMTP de Gmail como ejemplo)
const transporter = nodemailer.createTransport({
    service: 'gmail', // Puedes cambiar a 'outlook', 'hotmail', etc.
    auth: {
        user: USER_EMAIL,
        pass: APP_PASSWORD,
    },
});

/**
 * Función de la nube que recibe una solicitud HTTP POST del frontend
 * para enviar un correo electrónico con los datos del lead.
 * * Se activa mediante la URL HTTPS generada en el despliegue.
 */
exports.sendInterestLead = functions.https.onRequest((req, res) => {
    // CORS es necesario para permitir peticiones desde tu frontend (dominio diferente)
    cors(req, res, async () => {
        // Solo aceptar peticiones POST
        if (req.method !== 'POST') {
            logger.warn('Método no permitido:', req.method);
            return res.status(405).send('Método no permitido. Use POST.');
        }

        const data = req.body;

        // Validar datos mínimos necesarios
        if (!data.email || !data.name || !data.modelName) {
            logger.error('Faltan datos requeridos en el cuerpo de la solicitud.');
            return res.status(400).send('Faltan campos: email, name y modelName son obligatorios.');
        }

        logger.info(`Procesando solicitud de interés para: ${data.modelName}`, { email: data.email, name: data.name });

        // Contenido del correo que recibirás como administrador
        const mailOptions = {
            from: `Nuevo Lead <${USER_EMAIL}>`,
            to: USER_EMAIL, // Envía el correo a tu misma dirección (administrador)
            subject: `🚂 ¡NUEVO LEAD! Interés en: ${data.modelName}`,
            html: `
                <p><strong>Tipo de Solicitud:</strong> Interés en Modelo Específico / Landing Page</p>
                <p><strong>Modelo de Tren:</strong> ${data.modelName}</p>
                <p><strong>Nombre del Cliente:</strong> ${data.name}</p>
                <p><strong>Correo del Cliente:</strong> ${data.email}</p>
                <p><strong>ID de Usuario (si está logueado):</strong> ${data.userId || 'N/A (Público)'}</p>
                <br>
                <p>Responder a: ${data.email}</p>
            `,
        };

        try {
            // Envía el correo usando Nodemailer
            await transporter.sendMail(mailOptions);
            logger.info('Correo enviado exitosamente.');
            return res.status(200).send({ message: 'Solicitud procesada y correo enviado.' });
        } catch (error) {
            logger.error('Error al enviar el correo:', error);
            // Si hay un error, el código de respuesta debe ser 500 (Server Error)
            return res.status(500).send({ message: 'Fallo al enviar el correo.', error: error.message });
        }
    });
});