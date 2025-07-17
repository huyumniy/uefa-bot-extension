import GoogleSheetClient from "./services/sheets_api.js";
import config from '../config.json';

// Fetch and cache sheet data
async function fetchAndCacheSheet() {
  try {
    const client = new GoogleSheetClient(config.sheets_link, 'main');
    const data = await client.fetchSheetData();
    // Store the raw object or transform as needed
    await chrome.storage.local.set({ sheetData: data });
    console.log('Sheet data cached', data);
  } catch (err) {
    console.error('Failed to fetch sheet', err);
  }
}

// On install or update, fetch immediately and create recurring alarm
chrome.runtime.onInstalled.addListener(() => {
  fetchAndCacheSheet();
  chrome.alarms.create('refreshSheet', { periodInMinutes: config.sheets_refresh_interval_minutes });
});

// On startup, ensure the alarm exists and maybe fetch once
chrome.runtime.onStartup.addListener(() => {
  fetchAndCacheSheet();
  chrome.alarms.get('refreshSheet', alarm => {
    if (!alarm) {
      chrome.alarms.create('refreshSheet', { periodInMinutes: config.sheets_refresh_interval_minutes });
    }
  });
});

// When alarm fires, refresh the sheet cache
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'refreshSheet') {
    fetchAndCacheSheet();
  }
});

// Respond to content-script requests for the cached data
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getSheetData') {
    chrome.storage.local.get('sheetData', result => {
      sendResponse({ data: result.sheetData });
    });
    return true; // indicates async sendResponse
  }
});
