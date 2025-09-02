import express from "express";
import bodyParser from "body-parser";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// =============================================================
// 📂 Configuración para servir archivos estáticos (frontend)
// =============================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "..")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "index.html"));
});

// =============================================================
// 🔹 Configuración de Supabase
// =============================================================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// =============================================================
// 🔹 Configuración de nodemailer
// =============================================================
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  secure: process.env.MAIL_SECURE === "true",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// =============================================================
// 🔹 Endpoint para crear reserva
// =============================================================
app.post("/api/reserva", async (req, res) => {
  try {
    const {
      identificacion,
      nombre,
      email,
      telefono,
      tipoReserva,
      fechaIngreso,
      fechaSalida,
      adultos,
      ninos,
      parejas,
      habitaciones,
      precio,
      codigoPromocion,
      spa_plan,
      spa_personas,
      picnic_plan
    } = req.body;

    if (!identificacion || !nombre || !email || !tipoReserva) {
      return res.status(400).json({
        success: false,
        error: "Faltan campos obligatorios para la reserva.",
      });
    }

    let precioFinal = Number(precio) || 0;

    // =============================================================
    // 1️⃣ Validar disponibilidad (solo habitaciones)
    // =============================================================
    if (tipoReserva === "habitacion") {
      const { data: reservasExistentes, error: errorBusqueda } = await supabase
        .from("reservas")
        .select("*")
        .eq("habitaciones", habitaciones)
        .lt("fecha_ingreso", fechaSalida)
        .gt("fecha_salida", fechaIngreso);

      if (errorBusqueda) throw errorBusqueda;

      if (reservasExistentes && reservasExistentes.length > 0) {
        return res.status(400).json({
          success: false,
          error:
            "❌ No hay disponibilidad para estas fechas. Por favor elige otra fecha u otra habitación.",
        });
      }
    }

    // =============================================================
    // 2️⃣ Validar promoción
    // =============================================================
    if (codigoPromocion) {
      const { data: promo, error: errorPromo } = await supabase
        .from("promociones")
        .select("*")
        .eq("codigo", codigoPromocion)
        .single();

      if (errorPromo) throw errorPromo;

      if (!promo) {
        return res
          .status(400)
          .json({ success: false, error: "Código de promoción inválido" });
      }

      const hoy = new Date();
      const inicio = new Date(promo.fecha_inicio);
      const fin = new Date(promo.fecha_fin);

      if (hoy >= inicio && hoy <= fin) {
        precioFinal = precioFinal - precioFinal * (promo.descuento / 100);
      }
    }

    // =============================================================
    // 3️⃣ Guardar en Supabase
    // =============================================================
    const { error } = await supabase.from("reservas").insert([
      {
        identificacion,
        cliente: nombre,
        email,
        telefono,
        tipo_reserva: tipoReserva,
        fecha_ingreso: fechaIngreso,
        fecha_salida: fechaSalida || null,
        adultos: adultos || 0,
        ninos: ninos || 0,
        parejas: parejas || 0,
        habitaciones: tipoReserva === "habitacion" ? habitaciones : null,
        precio: precioFinal,
        codigo_promocion: codigoPromocion || null,
        spa_plan: spa_plan || null,
        spa_personas: spa_personas || 0,
        picnic_plan: picnic_plan || 0
      },
    ]);

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    // =============================================================
    // 4️⃣ Texto de servicios opcionales
    // =============================================================
    let detalleSpa = "Ninguno";
    if (spa_plan && spa_plan !== "0") {
      if (spa_plan == "60000") detalleSpa = "Masaje de espalda";
      else if (spa_plan == "90000") detalleSpa = "Masaje de cuerpo entero";
      else if (spa_plan == "100000") detalleSpa = "Masaje con chocolaterapia o frutos rojos";
      detalleSpa += ` (${spa_personas} persona(s))`;
    }

    let detallePicnic = "Ninguno";
    if (picnic_plan && picnic_plan !== "0") {
      if (picnic_plan == "180000") detallePicnic = "Picnic para 2 personas";
      else if (picnic_plan == "190000") detallePicnic = "Picnic para 3 a 5 personas";
      else if (picnic_plan == "210000") detallePicnic = "Picnic para 6 a 10 personas";
      else if (picnic_plan == "270000") detallePicnic = "Picnic para 11 a 20 personas";
      else if (picnic_plan == "320000") detallePicnic = "Picnic para 20 a 30 personas";
    }

    // =============================================================
    // 🏨 Mapear habitaciones a nombres legibles
    // =============================================================
    let detalleHabitacion = "N/A";
    if (tipoReserva === "habitacion") {
      const mapHabitaciones = {
        "suite-familiar": "Suite Familiar",
        "cabaña-familiar": "Cabaña Familiar",
        "habitacion-sencilla": "Habitación Sencilla",
        "habitacion-estandar": "Habitación Estándar",
        "suite-jacuzzi": "Suite con Jacuzzi",
      };
      detalleHabitacion = mapHabitaciones[habitaciones] || habitaciones;
    }

    // =============================================================
    // 5️⃣ Enviar correo al hotel
    // =============================================================
    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: process.env.MAIL_TO,
      subject: `📩 Nueva Reserva - ${tipoReserva}`,
      html: `
        <h2>Nueva Reserva</h2>
        <p><b>Identificación:</b> ${identificacion}</p>
        <p><b>Nombre:</b> ${nombre}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Teléfono:</b> ${telefono}</p>
        <p><b>Tipo de Reserva:</b> ${tipoReserva}</p>
        <p><b>Habitación / Producto:</b> ${detalleHabitacion}</p>
        <p><b>Fecha de Ingreso:</b> ${fechaIngreso}</p>
        <p><b>Fecha de Salida:</b> ${fechaSalida || "N/A"}</p>
        <p><b>Adultos:</b> ${adultos || 0}</p>
        <p><b>Niños:</b> ${ninos || 0}</p>
        <p><b>Parejas:</b> ${parejas || 0}</p>
        <p><b>Spa:</b> ${detalleSpa}</p>
        <p><b>Zona Picnic:</b> ${detallePicnic}</p>
        <p><b>Código Promoción:</b> ${codigoPromocion || "Ninguno"}</p>
        <p><b>Precio Final:</b> $${precioFinal.toLocaleString("es-CO")}</p>
      `,
    });

    // =============================================================
    // 6️⃣ Enviar confirmación al cliente
    // =============================================================
    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: email,
      subject: "✅ Solicitud de tu Reserva - Hotel Los Bucaros",
      html: `
        <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;border:1px solid #45c5f8ff;border-radius:8px;overflow:hidden;background:#fff;">
          <div style="background-color:#ff8000;padding:20px;text-align:center;color:white;">
            <img src="cid:logoBucaros" alt="Logo Hotel" style="max-width:120px;margin-bottom:10px;">
            <h2>Hacienda Hotel Los Búcaros</h2>
          </div>
          <div style="padding:20px;">
            <p>Hola <b>${nombre}</b>,</p>
            <p>Hemos recibido tu Solicitud de reserva con los siguientes datos:</p>
            <ul>
              <li><b>Tipo de Reserva:</b> ${tipoReserva}</li>
              <li><b>Habitación / Producto:</b> ${detalleHabitacion}</li>
              <li><b>Fecha de Ingreso:</b> ${fechaIngreso}</li>
              <li><b>Fecha de Salida:</b> ${fechaSalida || "N/A"}</li>
              <li><b>Adultos:</b> ${adultos || 0}</li>
              <li><b>Niños:</b> ${ninos || 0}</li>
              <li><b>Parejas:</b> ${parejas || 0}</li>
              <li><b>Servicios Spa:</b> ${detalleSpa}</li>
              <li><b>Zona Picnic:</b> ${detallePicnic}</li>
              <li><b>Precio Final:</b> $${precioFinal.toLocaleString("es-CO")}</li>
            </ul>
            <p>Nos pondremos en contacto contigo lo más pronto posible para confirmar tu reserva.</p>
            <p>¡Gracias por elegirnos! 🌿</p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: "logo.jpg",
          path: path.join(__dirname, "..", "img", "logo.jpg"),
          cid: "logoBucaros"
        }
      ]
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Error en /api/reserva:", err);
    res.status(500).json({ success: false, error: "Error al procesar la reserva" });
  }
});

// =============================================================
// 🔹 Iniciar servidor
// =============================================================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});
