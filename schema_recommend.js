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
 * @fileoverview Recommends a GA4-gtag command to send certain data..
 */
import schemaId from "./schema_id.js";

/**
 * @param {!Object<string, *>} parsedHitData Hit data in two buckets: params and
 *     products.
 * @return {string} A GA4 gtag command to send this data.
 */
function buildGa4GtagCommand(parsedHitData) {
  let eventParamsString = "";
  if (parsedHitData.params) {
    for (let paramName in parsedHitData.params) {
      if (parsedHitData.params.hasOwnProperty(paramName)) {
        eventParamsString += `\n  '${paramName}': '${parsedHitData.params[paramName]}',`;
      }
    }
  }
  let itemsString = "";
  if (parsedHitData.products) {
    for (let i = 1; i < parsedHitData.products.length; i++) {
      let product = parsedHitData.products[i];
      itemsString += "    {\n";
      for (let productField in product) {
        if (product.hasOwnProperty(productField)) {
          itemsString += `      '${productField}: '${product[productField]}',\n`;
        }
      }
      itemsString += "    },\n";
    }
  }
  if (itemsString) {
    itemsString = `\n  'items': [\n${itemsString}  ],\n`;
  } else {
    itemsString = "\n";
  }
  return `gtag('event', '${parsedHitData.event}', {${eventParamsString}${itemsString}});`;
}

export default { buildGa4GtagCommand };
