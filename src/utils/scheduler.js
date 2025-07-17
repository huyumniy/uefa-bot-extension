import { main } from "../content-scripts/content.js";
import config from '../../config.json'

export function _countAndRun() {
  console.log("No tickets found!");
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
