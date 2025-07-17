class GoogleSheetClient {
  /**
   * A helper class to fetch and parse data from a Google Sheets document
   * using the “gviz/tq” endpoint in vanilla JavaScript.
   */
  constructor(sheetUrl, sheetTitle = 'main') {
    const sheetId = sheetUrl.split('/d/')[1].split('/')[0];
    this.sheetId = sheetId;
    this.sheetTitle = sheetTitle;
  }

  /**
   * Read headers (row 1), then fetch A2:⟨lastColumn⟩,
   * returning an array of [matchValue, { header: value, … }]
   */
  async fetchSheetData() {
    const headers = await this._getColumnHeaders();
    if (!headers.length) return [];

    const lastCol = this._columnIndexToLetter(headers.length);
    const rawRows = await this._getDataRows(lastCol);

    const result = [];
    for (const rowObj of rawRows) {
      const parsed = this._parseSingleRow(rowObj.c || [], headers);
      if (parsed) result.push(parsed);
    }
    return result;
  }

  /**
   * Fetches an arbitrary range and returns [[col0, col1], ...]
   */
  async fetchSheetColumns(range) {
    try {
      const data = await this._fetchSheetJSON(range);
      const { cols = [], rows = [] } = data.table || {};
      if (!rows.length || !cols.length) return [];

      return rows.map(row => {
        const cells = row.c || [];
        return [0, 1].map(idx => {
          const cell = cells[idx];
          const col = cols[idx] || {};
          if (!cell || cell.v == null) return null;
          if (col.type === 'date') return cell.f || String(cell.v);
          if (col.type === 'number') {
            const v = cell.v;
            return Number.isFinite(v) && Number.isInteger(v) ? v : v;
          }
          if (col.type === 'string') return String(cell.v).trim();
          return cell.v;
        });
      });
    } catch (err) {
      console.error('Error in fetchSheetColumns:', err);
      return null;
    }
  }

  // --- Internal Helpers ---

  async _getColumnHeaders() {
    const data = await this._fetchSheetJSON('1:1');
    const rows = data.table?.rows || [];
    if (!rows.length) return [];

    const headerCells = rows[0].c || [];
    const headers = [];
    for (const cell of headerCells) {
      if (!cell || cell.v == null || cell.v === '') break;
      headers.push(String(cell.v));
    }
    return headers;
  }

  async _getDataRows(lastCol) {
    const data = await this._fetchSheetJSON(`A2:${lastCol}`);
    return data.table?.rows || [];
  }

  _parseSingleRow(cells, headers) {
    const getVal = idx => (cells[idx] ? cells[idx].v : null);
    const match = getVal(0);
    if (match == null || match === '') return null;

    const categories = {};
    for (let i = 1; i < headers.length; i++) {
      const raw = getVal(i);
      const val = raw != null && raw !== '' ? String(this._parseNullableInt(raw) ?? '') : '';
      categories[headers[i]] = val;
    }

    // skip rows with no category values
    if (!Object.values(categories).some(v => v !== '')) return null;
    return [match, categories];
  }

  async _fetchSheetJSON(range) {
    const url = `https://docs.google.com/spreadsheets/d/${this.sheetId}/gviz/tq?sheet=${this.sheetTitle}&range=${range}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Network error: ${resp.status}`);
    const text = await resp.text();
    const jsonText = text.slice(47, -2);
    return JSON.parse(jsonText);
  }

  _columnIndexToLetter(index) {
    let letters = '';
    while (index > 0) {
      const rem = (index - 1) % 26;
      letters = String.fromCharCode(65 + rem) + letters;
      index = Math.floor((index - 1) / 26);
    }
    return letters;
  }

  _parseNullableInt(raw) {
    const n = Number(raw);
    return Number.isFinite(n) && Number.isInteger(n) ? n : null;
  }
}

// Usage example:
// const client = new GoogleSheetClient('https://docs.google.com/spreadsheets/d/ABC123/edit', 'main');
// client.fetchSheetData().then(data => console.log(data));

export default GoogleSheetClient;