import { delay, filterMatchingKeys } from "../utils/helpers.js";
import { _countAndRun } from "../utils/scheduler.js";
import { requestSheetData, waitForSheetData } from "../services/chrome_extension_api.js";
import { findNearbyChains, getRandomChainSlice, getAllCategories } from "../utils/filtration.js";

import config from '../../config.json';

export let settings = {
  reloadTime: config.attempt_retry_seconds,
  matchesData: [],
  blacklist: []
}

export async function main() {
  try {
    while (true) {
      
      console.log('in main', settings.matchesData)
      // If captcha dialog present, bail
      if (document.querySelector('#captcha_dialog') || document.querySelector('iframe[title="DataDome CAPTCHA"]')) {
        console.log('CAPTCHA');
        return false;
      }
      if (window.location.href.includes('noAvailability')) {
        console.log('no availability')
        history.go(-1);
        return;
      }
      if (window.location.href.includes('/cart/reservation/0')) {
        let seats = document.querySelectorAll('table.widget_SPORTING_EVENT td.seat')
        if (!seats) return;
        seats.forEach(seat => {
          const innerDiv = seat.querySelector('div');
          
          if (!innerDiv) return;
          const txt = innerDiv.textContent.trim();
          seat.textContent = txt;
        })
        alert("Seats reserved!")
        return;
      }
      
      if (!settings.matchesData) {
        console.log('No matches data were found')
        _countAndRun()
        return;
      }
      const desired_match_names = settings.matchesData.map(item => item[0])
      let team_spans = document.querySelectorAll('.content_product_info > p.title span')

      if (team_spans.length === 0) {
        console.log("Cannot get information about current match from document selector");
        _countAndRun()
        return;
      }
      const current_match_name = team_spans[0].textContent.trim() + ' vs ' + team_spans[2].textContent.trim()
      if (!desired_match_names.includes(current_match_name)) {
        console.log("there's no such a match in spreadsheets...")
        _countAndRun()
        return;
      }

      let matchEntry = settings.matchesData.find(match => current_match_name === match[0]);
      let categoriesDict = matchEntry ? matchEntry[1] : {};
      console.log('categoriesDict', categoriesDict)
      

      const currentUrl = window.location.href;
      if (!currentUrl.includes('performanceId')) {
        console.log('No performanceId were found...');
        _countAndRun()
        return;
      }

      // Build domain and params
      const urlObj = new URL(currentUrl);
      const domain = `${urlObj.protocol}//${urlObj.host}`;
      const performanceId = urlObj.searchParams.get('performanceId');
      let productId = urlObj.searchParams.get('productId');
      if (!productId) {
        const section = document.querySelector('section[data-product-type="SPORTING_EVENT"]');
        productId = section && section.id.split('_')[1];
      }
      if (!productId) {
        console.log('No productId were found...');
        _countAndRun();
        return;
      }

      // Fetch seat data
      const seatsEndpoint = `${domain}/ajax/resale/freeSeats?productId=${productId}&performanceId=${performanceId}`;
      console.log('Fetching seats from:', seatsEndpoint);
      
      const seatsResp = await fetch(seatsEndpoint);
      if (!seatsResp.ok) {
        console.log('FreeSeats request error');
        window.location.reload();
        return;
      }
      const seatsJson = await seatsResp.json();

      if (!seatsJson || !seatsJson?.features) {
        console.log('No tickets from freeSeats request', seatsJson);
        _countAndRun();
        return;
      }

      // filter expired blacklist
      let now = Date.now();
      let blacklist = JSON.parse(localStorage.getItem("blacklist") || "[]");
      blacklist = blacklist.filter(entry => now - entry.timestamp < config.blacklist_ttl)
      localStorage.setItem("blacklist", JSON.stringify(blacklist));
      let blacklistIds = blacklist.map(entry => entry.id);
      // Read category legends
      const names = getAllCategories(seatsJson);
      console.log('get all cateogries function result', names)

      const availableCategories = filterMatchingKeys(names, categoriesDict)
      if (!availableCategories.length) {
        console.log('No matching categories found');
        _countAndRun();
        return;
      }
      const chosen = availableCategories[Math.floor(Math.random() * availableCategories.length)];
      const qty = parseInt(categoriesDict[chosen], 10);
      

      // Build chains
      const chains = findNearbyChains(seatsJson.features, qty, chosen, blacklistIds);
      console.log(chains.length, 'chains found');
      if (!chains.length) {
        _countAndRun();
        return;
      }

      // Pick chain slice
      const chain = getRandomChainSlice(chains, qty);
      if (!chain.length) {
        _countAndRun();
        return;
      }

      // Get CSRF
      const csrfResp = await fetch(`${domain}/ajax/selection/csrf/acquire`);
      if (!csrfResp.ok) {
        _countAndRun();
        return;
      }
      const csrfToken = await csrfResp.text();

      // Build form payload
      const form = document.querySelector('#ResaleItemFormModel');
      if (!form) throw new Error('Form not found');
      form.innerHTML = '';

      const addField = (name, value) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
      };

      addField('_csrf', csrfToken);
      addField('performanceId', performanceId);

      
      let valid = true;
      for (let i = 0; i < chain.length; i++) {
        const seat = chain[i];
        blacklist.push({ id: seat.id, timestamp: Date.now() })
        const infoUrl = `${domain}/ajax/resale/seatInfo?productId=${productId}` +
          `&perfId=${performanceId}&seatId=${seat.id}&advantageId=&ppid=&reservationIdx=&crossSellId=`;
        const infoResp = await fetch(infoUrl);
        if (!infoResp.ok) { valid = false; break; }
        const infoJson = await infoResp.json();
        if (infoJson.error) { valid = false; break; }

        const r = infoJson.resaleInfo;
        const p = infoJson.prices[0];

        addField(`resaleItemData[${i}].audienceSubCategoryId`, r.audienceSubCategoryId);
        addField(`resaleItemData[${i}].seatCategoryId`, seat.properties.seatCategoryId);
        addField(`resaleItemData[${i}].quantity`, '1');
        addField(`resaleItemData[${i}].unitAmount`, seat.properties.amount);
        addField(`resaleItemData[${i}].key`, r.resaleKey);
        addField(`resaleItemData[${i}].priceLevelId`, p.priceLevelId);
        addField(`resaleItemData[${i}].movementIds[0]`, r.resaleMovId);
      }

      if (!valid) {
        _countAndRun();
        return;
      }
      localStorage.setItem("blacklist", JSON.stringify(blacklist));
      form.submit();
      return true;
    }
  } catch (err) {
    console.error('Resale flow error:', err);
  }
  return false;
}

(async function init() {
  await waitForSheetData();
  await main();

})();

setInterval(() => {
  requestSheetData()
}, 60_000);
