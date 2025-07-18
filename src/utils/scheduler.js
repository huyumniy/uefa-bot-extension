import { main } from "../content-scripts/content.js";
import config from '../../config.json'

export function _countAndRun() {
  const message = 'No tickets found!'
  console.log(message);
  displayTextInBottomLeftCorner(message)
  setTimeout(
    () => {
      _countScriptRunning();
      main();
      console.log("calling main function");
    },
    config.attempt_retry_seconds * 1000
  );
}

export function _countScriptRunning() {
  let ticketCatcherCounter = sessionStorage.getItem("ticketCatcherCounter");
  if (ticketCatcherCounter === null) ticketCatcherCounter = 1;
  console.log(
    'Script ' +
      ' has been run ' +
      ticketCatcherCounter +
      " times from " +
      config.max_attempts_to_reload +
      "."
  );
  if (ticketCatcherCounter >= config.max_attempts_to_reload) {
    sessionStorage.setItem("ticketCatcherCounter", 0);
    console.log("reloading page...");
    window.location.reload();
  } else {
    sessionStorage.setItem("ticketCatcherCounter", ++ticketCatcherCounter);
  }
}

function displayTextInBottomLeftCorner(text) {
    const existingTextElement = document.getElementById("bottomLeftText");

    // Функція для форматування чисел менше 10 з додаванням "0" спереду
    function formatNumber(num) {
      return num < 10 ? `0${num}` : num;
    }

    // Функція для отримання поточного часу у форматі "ГГ:ХХ:СС"
    function getCurrentTime() {
      const now = new Date();
      const hours = formatNumber(now.getHours());
      const minutes = formatNumber(now.getMinutes());
      const seconds = formatNumber(now.getSeconds());
      return `${hours}:${minutes}:${seconds}`;
    }

    if (!existingTextElement) {
      // Створюємо елемент, якщо він ще не існує
      const newTextElement = document.createElement("div");
      newTextElement.id = "bottomLeftText";

      // Стилі для новоствореного елементу
      newTextElement.style.position = "fixed";
      newTextElement.style.bottom = "0";
      newTextElement.style.left = "0";
      newTextElement.style.padding = "10px";
      newTextElement.style.backgroundColor = "#000";
      newTextElement.style.color = "#fff";
      newTextElement.style.fontFamily = "Arial, sans-serif";

      // Додаємо новостворений елемент до body
      document.body.appendChild(newTextElement);

      // Виводимо текст та час
      newTextElement.textContent = `${text} - ${getCurrentTime()}`;
    } else {
      // Оновлюємо текст та час у вже існуючому елементі
      existingTextElement.textContent = `${text} - ${getCurrentTime()}`;
    }
  }
