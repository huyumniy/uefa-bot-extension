import { delay, filterMatchingKeys } from "../utils/helpers.js";
import { _countAndRun } from "../utils/scheduler.js";
import { requestSheetData, waitForSheetData } from "../services/chrome_extension_api.js";
import { findNearbyChains, getRandomChainSlice } from "../utils/filtration.js";

import config from '../../config.json';

export let settings = {
  reloadTime: config.attempt_retry_seconds,
  matchesData: []
}

export async function main() {
  try {
    while (true) {
      console.log('in main', settings.matchesData)
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
      const current_match_name = team_spans[0].text.trim() + ' vs ' + team_spans[2].text.trim()
      if (!desired_match_names.includes(current_match_name)) {
        console.log("there's no such a match in spreadsheets...")
        _countAndRun()
        return;
      }

      // If captcha dialog present, bail
      if (document.querySelector('#captcha_dialog')) {
        return false;
      }

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

      // Read category legends
      const legends = Array.from(document.querySelectorAll('.seat-info-category-legend'));
      const names = legends.map(el => {
        const span = el.querySelector('p > label > span:nth-child(2)');
        return span ? span.textContent.trim() : '';
      }).filter(Boolean);

      const availableCategories = filterMatchingKeys(names, categoriesDict)
      if (!availableCategories.length) {
        console.log('No matching categories found');
        return false;
      }
      const chosen = availableCategories[Math.floor(Math.random() * availableCategories.length)];
      const qty = parseInt(categoriesDict[chosen], 10);
      
      // Fetch seat data

      const seatsEndpoint = `${domain}/ajax/resale/freeSeats?productId=${productId}&performanceId=${performanceId}`;
      console.log('Fetching seats from:', seatsEndpoint);
      
      const seatsResp = await fetch(seatsEndpoint);
      if (!seatsResp.ok) throw new Error('FreeSeats request failed');
      const seatsJson = await seatsResp.json();

      // Build chains
      const chains = findNearbyChains(seatsJson.features, qty, chosen);
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
