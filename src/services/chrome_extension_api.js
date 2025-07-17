import { settings } from "../content-scripts/content.js";
import { delay } from "../utils/helpers.js";

function requestSheetData() {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ action: 'getSheetData' }, response => {
      if (response && response.data && response.data.length) {
        console.log('Received sheet data:', response.data);
        settings.matchesData = response.data;
        resolve(response.data);
      } else {
        console.warn('No sheet data available yet');
        resolve(null);
      }
    });
  });
}

async function waitForSheetData(retrySeconds = 1) {
  let data = null;
  while (!data || !data.length) {
    data = await requestSheetData();
    if (data && data.length) {
      settings.matchesData = data;
      break;
    }
    await delay(retrySeconds);
  }
}

export { requestSheetData, waitForSheetData }