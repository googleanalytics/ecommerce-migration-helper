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
 * universal analytics / measurement protocol hits.
 */

/**
 * @const {!RegExp} Regex for identifying a UA hit from the UA-GTM schema only
 * tag, which has event label "GTM".
 */
const UA_LEGACY_REGEX = /\/collect\?.*&el=GTM/;

/**
 * @const {!RegExp} Regex for identifying a UA hit from the UA-GA4 schema enabled
 * tag, which has event label "GA4".
 */
const UA_GA4_REGEX = /\/collect\?.*&el=GA4/;

/**
 * @const {!RegExp} Regex for identifying a product field parameter. Capturing
 * group 1 is the product index, capturing group 2 is the two-character field
 * identifier, and capturing group 3 is the field value.
 */
const UA_PRODUCT_REGEX = /&pr(\d+)(\w\w)=?([^&]*)/g;

/**
 * @const {!RegExp} Regex for identifying a list name parameter. Capturing
 * group 1 is the list index and capturing group 2 is the list name.
 */
const UA_LIST_NAME_REGEX = /&il(\d+)nm=([^&]*)/g;

/**
 * @const {!RegExp} Regex for identifying an impression field. Capturing
 * group 1 is the list index, capturing group 2 is the impression index within
 * the list, capturing group 3 is the two-character field identifier, and
 * capturing group 4 is the field value.
 */
const UA_IMPRESSION_REGEX = /&il(\d+)pi(\d+)(\w\w)=([^&]*)/g;

/**
 * @const {!RegExp} Regex for identifying a promo field parameter. Capturing
 * group 1 is the product index, capturing group 2 is the two-character field
 * identifier, and capturing group 3 is the field value.
 */
const UA_PROMO_REGEX = /&promo(\d+)(\w\w)=([^&]*)/g;

/**
 * @const {!RegExp} Regex for identifying product action parameters. Capturing
 * group 1 is the measurement protocol paramater, and capturing group 2 is the
 * parameter vaule.
 */
const UA_PARAMS_REGEX = /&(pa|ti|ta|tr|tt|ts|tcc|pal|cos|col|promoa|cu)=([^&]*)/g;

/**
 * @const {!Object<string, string>} Map of product 2-character identifiers to
 * GA4 product fields.
 */
const UA_PRODUCT_FIELDS = {
  id: "item_id",
  nm: "item_name",
  br: "item_brand",
  ca: "item_category",
  va: "item_variant",
  qt: "quantity",
  pr: "price",
  cc: "coupon",
  ps: "index",
};

/**
 * @const {!Object<string, string>} Map of impression 2-character identifiers to
 * GA4 product fields.
 */
const UA_IMPRESSION_FIELDS = {
  id: "item_id",
  nm: "item_name",
  br: "item_brand",
  ca: "item_category",
  va: "item_variant",
  ps: "index",
  pr: "price",
};

/**
 * @const {!Object<string, string>} Map of promotion 2-character identifiers to
 * GA4 product fields.
 */
const UA_PROMOTION_FIELDS = {
  id: "item_id",
  nm: "item_name",
  cr: "creative_name",
  ps: "index",
};

/**
 * @const {!Object<string, string>} Map of action level parameters to GA4 event
 * parameters.
 */
const UA_PARAMS = {
  pa: "product_action",
  ti: "transaction_id",
  ta: "affiliation",
  tr: "value",
  tt: "tax",
  ts: "shipping",
  tcc: "coupon",
  pal: "item_list_name",
  cos: "checkout_step",
  col: "checkout_option",
  promoa: "promo_action",
  cu: "currency",
};

function parse(url) {
  const parsedData = {
    products: [],
  };

  const productFields = url.matchAll(UA_PRODUCT_REGEX);
  if (productFields) {
    for (const p of productFields) {
      const productIndex = p[1];
      const product = parsedData.products[productIndex] || {};
      const productField = p[2];
      const productValue = p[3];
      product[UA_PRODUCT_FIELDS[productField]] = productValue;
      parsedData.products[productIndex] = product;
    }
  }

  const impressionLists = url.matchAll(UA_LIST_NAME_REGEX);
  if (impressionLists) {
    parsedData.impressions = [];
    for (const list of impressionLists) {
      const impressionListIndex = list[1];
      const impressionList = parsedData.impressions[impressionListIndex] || {
        impressions: [],
      };

      const listName = list[2];

      parsedData.impressions[impressionListIndex] = impressionList;
      impressionList.name = listName;
    }
  }

  const impressionFields = url.matchAll(UA_IMPRESSION_REGEX);
  if (impressionFields) {
    parsedData.impressions = parsedData.impressions || [];
    for (const imp of impressionFields) {
      const impressionListIndex = imp[1];
      const impressionList = parsedData.impressions[impressionListIndex] || {
        impressions: [],
      };

      const impressionIndex = imp[2];
      const impression = impressionList.impressions[impressionIndex] || {};
      const impressionField = imp[3];
      const impressionValue = imp[4];
      impression[UA_IMPRESSION_FIELDS[impressionField]] = impressionValue;
      parsedData.impressions[impressionListIndex] = impressionList;
      impressionList.impressions[impressionIndex] = impression;
    }
  }

  const promoFields = url.matchAll(UA_PROMO_REGEX);
  if (promoFields) {
    parsedData.promos = [];
    for (const p of promoFields) {
      const promoIndex = p[1];
      const promo = parsedData.promos[promoIndex] || {};
      const promoField = p[2];
      const promoValue = p[3];
      promo[UA_PROMOTION_FIELDS[promoField]] = promoValue;
      parsedData.promos[promoIndex] = promo;
    }
  }

  const additionalFields = url.matchAll(UA_PARAMS_REGEX);
  if (additionalFields) {
    parsedData.params = {};
    for (const field of additionalFields) {
      const fieldCode = field[1];
      const fieldValue = field[2];
      parsedData.params[UA_PARAMS[fieldCode]] = fieldValue;
    }
  }
  return parsedData;
}

/**
 * @param {string} url The URL to check.
 * @return {boolean} Returns true iff the URL is a hit sent by the UA legacy
 *     schema only tag.
 */
function isUaLegacyHit(url) {
  return UA_LEGACY_REGEX.test(url);
}

/**
 * @param {string} url The URL to check.
 * @return {boolean} Returns true iff the URL is a hit sent by the UA tag with
 *     GA4 schema support enabled.
 */
function isUaGa4Hit(url) {
  return UA_GA4_REGEX.test(url);
}

export default { parse, isUaLegacyHit, isUaGa4Hit };
