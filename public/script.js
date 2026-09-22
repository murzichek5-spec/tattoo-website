const track = document.querySelector(".carousel-track");
const slides = document.querySelectorAll(".slide");
const prev = document.getElementById("prev");
const next = document.getElementById("next");
const currentSlide = document.getElementById("currentSlide");

let index = 0;

function updateCarousel() {
  track.style.transform = `translateX(-${index * 100}%)`;
  currentSlide.textContent = String(index + 1).padStart(2, "0");
}

next.addEventListener("click", () => {
  index = (index + 1) % slides.length;
  updateCarousel();
});

prev.addEventListener("click", () => {
  index = (index - 1 + slides.length) % slides.length;
  updateCarousel();
});

const dateInput = document.getElementById("date");
const now = new Date();
const localToday =
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
dateInput.min = localToday;

const form = document.getElementById("bookingForm");
const message = document.getElementById("formMessage");
const submitButton = document.getElementById("submitButton");

function showMessage(text, type) {
  message.textContent = text;
  message.className = `form-message ${type}`;
  message.style.display = "block";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  message.style.display = "none";
  submitButton.disabled = true;
  submitButton.textContent = "Отправка...";

  try {
    const formData = new FormData(form);

    const response = await fetch("/api/bookings", {
      method: "POST",
      body: formData
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.message || "Не удалось отправить заявку.");
    }

    showMessage(
      "Заявка отправлена. Я свяжусь с вами для подтверждения записи.",
      "success"
    );

    form.reset();
    dateInput.min = localToday;
  } catch (error) {
    showMessage(
      error.message || "Произошла ошибка. Попробуйте ещё раз.",
      "error"
    );
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Отправить заявку";
  }
});
