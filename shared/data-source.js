// DATA SOURCE — the only place these pages get data from. Nothing else in pages/ or shared/ calls fetch().
//
// Today every function reads the mock files. To connect the real API, replace the body of each function with the
// API call and return THE SAME SHAPE (documented field by field in DATA.md). No page or component needs to change.
//
//   fetchCommon()      -> data shared by all pages          (shape: mock/common.json)
//   fetchPage(page)    -> data of one page                  (shape: the "default" object of mock/<page>.json)
//   fetchCopy()        -> UI strings, key -> text           (copy/en.json; swap the file to localise)
//   fetchPreview(page) -> PREVIEW ONLY: the named state overrides used by ?state=...; return {} with a real API
//
// `page` is 'dashboard' | 'trading-task' | 'point-balance'.

const getJSON = (path) =>
  fetch(path).then((res) => {
    if (!res.ok) throw new Error(`${path}: ${res.status}`);
    return res.json();
  });

// API: user + programme data shared by all pages (balance, programme rules, trading accounts, earning rates, ...).
export const fetchCommon = () => getJSON('../mock/common.json');

// API: the data of one page.
export const fetchPage = (page) => getJSON(`../mock/${page}.json`).then((file) => file.default);

export const fetchCopy = () => getJSON('../copy/en.json');

// PREVIEW ONLY: state overrides for the ?state= switcher. With a real API this returns {} (no states).
export const fetchPreview = (page) => getJSON(`../mock/${page}.json`).then((file) => file.states);
