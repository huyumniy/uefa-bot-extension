const filterMatchingKeys = (keys, lookup) => keys.filter(key => Boolean(lookup[key]));

const delay = (time) => new Promise(res => setTimeout(res, time * 1000));

export { delay, filterMatchingKeys };