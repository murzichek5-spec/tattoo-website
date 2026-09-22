import "dotenv/config";
import express from "express";
import multer from "multer";

const app = express();
const PORT = process.env.PORT || 3000;

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

app.disable("x-powered-by");
app.use(express.static("public"));

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp"
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 1,
    fields: 20
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return callback(new Error("Можно загрузить только JPG, PNG или WEBP."));
    }

    callback(null, true);
  }
});

function clean(value, maxLength = 1000) {
  return String(value ?? "")
    .replace(/\0/g, "")
    .trim()
    .slice(0, maxLength);
}

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidTime(value) {
  return /^\d{2}:\d{2}$/.test(value);
}

function assertTelegramConfigured() {
  if (!BOT_TOKEN || !CHAT_ID) {
    throw new Error(
      "Telegram не настроен. Добавьте TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID в .env."
    );
  }
}

async function sendTelegramMessage(text) {
  assertTelegramConfigured();

  const response = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        chat_id: CHAT_ID,
        text,
        disable_web_page_preview: "true"
      })
    }
  );

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.description || "Не удалось отправить сообщение в Telegram.");
  }

  return data;
}

async function sendTelegramPhoto(file, caption = "") {
  assertTelegramConfigured();

  const form = new FormData();
  form.append("chat_id", CHAT_ID);
  form.append("caption", caption);

  const blob = new Blob(
    [file.buffer],
    { type: file.mimetype }
  );

  form.append(
    "photo",
    blob,
    file.originalname || "sketch.jpg"
  );

  const response = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`,
    {
      method: "POST",
      body: form
    }
  );

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.description || "Не удалось отправить эскиз в Telegram.");
  }

  return data;
}

app.post("/api/bookings", upload.single("sketch"), async (req, res) => {
  try {
    const name = clean(req.body.name, 80);
    const contact = clean(req.body.contact, 120);
    const date = clean(req.body.date, 10);
    const time = clean(req.body.time, 5);
    const placement = clean(req.body.placement, 120);
    const description = clean(req.body.description, 1200);

    if (!name || !contact || !date || !time || !placement) {
      return res.status(400).json({
        ok: false,
        message: "Заполните все обязательные поля."
      });
    }

    if (!isValidDate(date) || !isValidTime(time)) {
      return res.status(400).json({
        ok: false,
        message: "Некорректная дата или время."
      });
    }

    const text = [
      "🖤 Новая заявка на тату",
      "",
      `Имя: ${name}`,
      `Контакт: ${contact}`,
      `Дата: ${date}`,
      `Время: ${time}`,
      `Место нанесения: ${placement}`,
      "",
      "Идея:",
      description || "Не указана",
      "",
      req.file ? "📎 Эскиз прикреплён ниже." : "📎 Эскиз не прикреплён."
    ].join("\n");

    await sendTelegramMessage(text);

    if (req.file) {
      await sendTelegramPhoto(
        req.file,
        `Эскиз от ${name} — ${date} ${time}`
      );
    }

    return res.json({
      ok: true,
      message: "Заявка успешно отправлена."
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      ok: false,
      message: "Не удалось отправить заявку. Проверьте настройки Telegram."
    });
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);

  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      ok: false,
      message: "Файл слишком большой. Максимум 8 МБ."
    });
  }

  return res.status(400).json({
    ok: false,
    message: error.message || "Ошибка при загрузке файла."
  });
});

app.listen(PORT, () => {
  console.log(`Tattoo booking site: http://localhost:${PORT}`);
});
