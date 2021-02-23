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
 * @fileoverview Support for identifying different ecommerce input schemas.
 */

/** @enum {string} */
const KnownSchema = {
  UNKNOWN: "unknown",
  UNKNOWN_GTAG: "gtag-unknown",
  GTM_UA: "ua-gtm",
  GTM_LEGACY_GA4: "ga4-gtm",
  GTAG_UA: "ua-gtag",
  UNIFIED: "ga4-gtag",
};

/** @enum {string} */
const Api = {
  DATA_LAYER: "dataLayer",
  GTAG: "gtag",
};

/**
 * @param {!Api} api
 * @param {!Object<string, *>} paramsObject
 * @return {!KnownSchema} The schema that this combination of API and parameters
 *     most likely belongts to.
 */
function identifySchema(api, paramsObject) {
  switch (api) {
    case Api.GTAG:
      if (
        !(
          paramsObject["items"] ||
          paramsObject["transaction_id"] ||
          paramsObject["value"] ||
          paramsObject["currency"]
        )
      ) {
        // No common markers for ecommerce data.
        return KnownSchema.UNKNOWN;
      }
      const items = paramsObject["items"];
      if (!items.length || !items.push) {
        // No items in array, or it isn't an array-like. Can't differentiate UA
        // and GA4.
        return KnownSchema.UNKNOWN_GTAG;
      }

      let currentSchema = undefined;
      for (let i = 0; i < items.length; i++) {
        let thisItemSchema = undefined;
        if (
          items[i]["item_id"] ||
          items[i]["item_name"] ||
          items[i]["promotion_id"] ||
          items[i]["promotion_name"] ||
          items[i]["creative_name"]
        ) {
          thisItemSchema = KnownSchema.UNIFIED;
        }
        if (items[i]["id"] || items[i]["name"]) {
          thisItemSchema = KnownSchema.GTAG_UA;
        }
        if (!currentSchema || currentSchema === thisItemSchema) {
          currentSchema = thisItemSchema;
        } else {
          // Mixed schemas.
          currentSchema = KnownSchema.UNKNOWN_GTAG;
        }
      }
      return currentSchema;

    case Api.DATA_LAYER:
      if (!paramsObject["ecommerce"]) {
        // No ecommerce object = not a valid schema.
        return KnownSchema.UNKNOWN;
      }
      const ecommerceObject = paramsObject["ecommerce"];
      if (
        ecommerceObject["items"] ||
        ecommerceObject["transaction_id"] ||
        ecommerceObject["value"]
      ) {
        // Contains one of the primary GA4 schema markers.
        return KnownSchema.GTM_LEGACY_GA4;
      }

      const actionObject =
        ecommerceObject["detail"] ||
        ecommerceObject["click"] ||
        ecommerceObject["add"] ||
        ecommerceObject["remove"] ||
        ecommerceObject["purchase"] ||
        ecommerceObject["refund"] ||
        ecommerceObject["checkout"] ||
        ecommerceObject["checkoutStep"] ||
        ecommerceObject["promoView"] ||
        ecommerceObject["promoClick"];
      if (actionObject) {
        if (
          actionObject["actionField"] ||
          actionObject["products"] ||
          actionObject["promotions"]
        ) {
          // Contains a named action and either action fields or prodcuts/promos.
          // These are markers foor the UA schema.
          return KnownSchema.GTM_UA;
        } else if (actionObject["items"]) {
          // Action object contains GA4 style items list and no UA markers -
          // probably a GA4 schema adaptation.
          return KnownSchema.GTM_LEGACY_GA4;
        }
      }

      if (ecommerceObject["impressions"]) {
        // Impressions marker from UA schema is a last-ditch way to identify
        // that when nothing else matched.
        return KnownSchema.GTM_UA;
      }
      break;
  }
  return KnownSchema.UNKNOWN;
}

export default { identifySchema, KnownSchema, Api };
