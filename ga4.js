// Copyright 2021 Google LLC

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//     https://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Support for identifying and parsing ecommerce data from
 * GA4 hits.
 */

/**
 * @const {!RegExp} Regex for identifying a GA4 hit.
 */
const GA4_URL_REGEX = /\/g\/collect\?/;

/**
 * @const {!RegExp} Regex for identifying product data in a GA4 hit. Capturing
 * group 1 is the product index and capturing group 2 is the product data.
 */
const GA4_PRODUCT_REGEX = /&pr(\d+)=([^&]*)/g;
/**
 * @const {!RegExp} Regex for identifying standard event parameters in a GA4
 * hit. Capturing group 1 is the parameter name, capturing group 2 is the
 * parameter value.
 */
const GA4_PARAM_REGEX = /&epn?\.([^=]+)=([^&]*)/g;

/**
 * @const {!RegExp} Regex for identifying the event name in a GA4 hit. Capturing
 * group 1 is the event name.
 */
const GA4_EVENT_NAME_REGEX = /&en=([^&]*)/g;

const GA4_PRODUCT_FIELDS = {
  id: "item_id",
  nm: "item_name",
  br: "item_brand",
  ca: "item_category",
  c2: "item_category2",
  c3: "item_category3",
  c4: "item_category4",
  c5: "item_category5",
  va: "item_variant",
  pr: "price",
  qt: "quantity",
  cp: "coupon",
  ln: "item_list_name",
  li: "item_list_id",
  lp: "index",
  ds: "discount",
  af: "affiliation",
  pi: "promotion_id",
  pn: "promotion_name",
  cn: "creative_name",
  cs: "creative_slot",
  lo: "Location ID",
};

/**
 * Parses event parameters and ecommerce product data from a GA4 hit and returns
 * it in a structured format.
 */
function parse(url) {
  const parsedData = {
    products: [],
  };
  const products = url.matchAll(GA4_PRODUCT_REGEX);
  if (products) {
    for (const p of products) {
      const product = {};
      const productIndex = p[1];
      const productParts = p[2].split("~");
      for (let i = 0; i < productParts.length; i++) {
        let productPart = productParts[i];
        while (i + 1 < productParts.length && !productParts[i + 1]) {
          productPart += "~";
          if (productParts[i + 2]) productPart += productParts[i + 2];
          i += 2;
        }
        const code = productPart.substring(0, 2);
        product[GA4_PRODUCT_FIELDS[code]] = productPart.substring(2);
      }
      parsedData.products[productIndex] = product;
    }
  }
  const params = url.matchAll(GA4_PARAM_REGEX);
  if (params) {
    parsedData.params = {};
    for (let p of params) {
      parsedData.params[p[1]] = p[2];
    }
  }

  const eventName = [...url.matchAll(GA4_EVENT_NAME_REGEX)];
  if (eventName[0]) {
    parsedData.event = eventName[0][1];
  }
  return parsedData;
}

/**
 * @param {string} url The URL to check.
 * @return {boolean} Returns true iff the URL is a hit sent by the GA4 tag.
 */
function isGa4Hit(url) {
  return GA4_URL_REGEX.test(url);
}

export default { isGa4Hit, parse };
