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
 * @fileoverview The UI code for the schema test page.
 */

import ga4 from "./ga4.js";
import measurementProtocol from "./measurement_protocol.js";
import schemaId from "./schema_id.js";
import schemaRecommend from "./schema_recommend.js";

const GtagDiv = document.getElementById("gtag");
const DataLayerDiv = document.getElementById("dataLayer");
const ApiSelector = document.getElementById("api");
const GtagEventTextbox = document.getElementById("gtag-event");
const GtagParamsTextBox = document.getElementById("gtag-params");
const DataLayerParamsTextBox = document.getElementById("dl-params");
const SubmitButton = document.getElementById("submit");
const Ga4Result = document.getElementById("ga4-result");
const UaGa4Result = document.getElementById("ua-ga4-result");
const UaLegacyResult = document.getElementById("ua-legacy-result");
const Ga4GtagCommand = document.getElementById("ga4-gtag-command");
const SchemaIdOptions = [
  document.getElementById("schema-not-submitted"),
  document.getElementById("schema-unknown"),
  document.getElementById("schema-known"),
  document.getElementById("schema-ga4-gtag"),
  document.getElementById("schema-ga4-gtm"),
  document.getElementById("schema-ua-gtag"),
  document.getElementById("schema-ua-gtm"),
  document.getElementById("schema-gtag-unknown"),
];

const SHOW_CLASS = "";
const HIDE_CLASS = "hidden";

let lastParamString = '';
let paramsPromise;

/**
 * gtag declaration (since the snippet is GTM).
 */
function gtag() {
  dataLayer.push(arguments);
}

/**
 * @return {string}
 */
function getApi() {
  return ApiSelector.value;
}

/**
 * @return {!Promise<!Object<string, *>>}
 */
function getParams() {
  let paramsString = "";

  switch(getApi()) {
    case schemaId.Api.GTAG:
      paramsString = GtagParamsTextBox.value;
      break;
    case schemaId.Api.DATA_LAYER:
      paramsString = DataLayerParamsTextBox.value;
      break;
  }
  if (paramsString !== lastParamString) {
    lastParamString = paramsString;
    paramsPromise = new Promise(function(resolve, reject) {
      // Some effort to prevent weird inputs.
      if (paramsString.indexOf('</script>') >= 0) {
        reject('Invalid input.');
      }
      try {
        window['resolveParams'] = resolve;
        const scriptElem = document.createElement('script');
        window.onerror = (message, source, line) => {
          reject(`Error parsing parameters on line ${line}: ${message}`);
          return false;
        };
        scriptElem.text = `window['resolveParams'](${paramsString});`;
        const firstScript = document.getElementsByTagName('script')[0];
        firstScript.parentNode.insertBefore(scriptElem, firstScript);
      } catch (ex) {
        reject(`Error parsing parameters: ${ex.message}`);
      }
    });
  }
  // Re-evaluating the same parameters, so reuse the same promise.
  // (It may already have been resolved).
  return paramsPromise;
}

/**
 * @param {?Event} event
 */
function onApiChange(event) {
  switch (getApi()) {
    case schemaId.Api.GTAG:
      GtagDiv.className = SHOW_CLASS;
      DataLayerDiv.className = HIDE_CLASS;
      break;
    case schemaId.Api.DATA_LAYER:
      GtagDiv.className = HIDE_CLASS;
      DataLayerDiv.className = SHOW_CLASS;
      break;
    default:
      GtagDiv.className = HIDE_CLASS;
      DataLayerDiv.className = HIDE_CLASS;
  }
}

/**
 * Updates the Schema ID portion of the UI with the current schema.
 */
function updateSchemaId() {
  getParams().then((params) => {
    const schema = schemaId.identifySchema(getApi(), params);
    for (let i = 0; i < SchemaIdOptions.length; i++) {
      SchemaIdOptions[i].className = HIDE_CLASS;
    }
    document.getElementById("schema-known").className = SHOW_CLASS;
    document.getElementById(`schema-${schema}`).className = SHOW_CLASS;
  });
}

/**
 * @param {?Event} event
 */
function onSubmit(event) {
  function clear(element) {
    element.value = "Waiting for data...";
    element.rows = 1;
  }
  clear(Ga4Result);
  clear(UaGa4Result);
  clear(UaLegacyResult);
  clear(Ga4GtagCommand);
  updateSchemaId();
  // Clear the previous ecommerce object from the data layer if present.
  // Prevents a previous schema test from affecting the current one.
  dataLayer.push({ ecommerce: null });
  getParams().then((params) => {
    switch (getApi()) {
      case "gtag":
        gtag("event", GtagEventTextbox.value, params);
        break;
      case "dataLayer":
        if (!params["event"]) {
          alert(
            "Data layer update does not have an event name." +
              " No tags will fire."
          );
        }
        dataLayer.push(params);
        break;
    }
  }).catch((message) => {
    alert(message);
  });
}

/**
 * @param {{
 *   products: !Array<!Object<string, *>>,
 *   params: ?Object<string, *>
 * }} data
 * @param {!Element} element
 */
function show(data, element) {
  let valueParts = [];
  data.products.forEach((value, index) => {
    valueParts.push(`Product ${index}`);
    for (const field of Object.keys(value)) {
      valueParts.push(`  ${field}: ${value[field]}`);
    }
  });
  if (data.impressions) {
    data.impressions.forEach((list, listIndex) => {
      valueParts.push(`Impression List ${listIndex}`);
      if (list.name) {
        valueParts.push(`  Name: ${list.name}`);
      }
      list.impressions.forEach((value, index) => {
        valueParts.push(`  Impression ${index}`);
        for (const field of Object.keys(value)) {
          valueParts.push(`    ${field}: ${value[field]}`);
        }
      });
    });
  }
  if (data.promos) {
    data.promos.forEach((value, index) => {
      valueParts.push(`Promo ${index}`);
      for (const field of Object.keys(value)) {
        valueParts.push(`  ${field}: ${value[field]}`);
      }
    });
  }
  if (data.params && Object.keys(data.params).length) {
    valueParts.push("Additional Parameters:");
    for (const field of Object.keys(data.params)) {
      valueParts.push(`  ${field}: ${data.params[field]}`);
    }
  }

  if (valueParts.length === 0) {
    element.value = "No ecommerce data found";
    element.rows = "1";
  } else {
    element.value = valueParts.join("\n");
    element.rows = valueParts.length;
  }
}

/**
 * Main init method for the script.
 */
function main() {
  ApiSelector.addEventListener("change", onApiChange);
  onApiChange(null);
  SubmitButton.addEventListener("click", onSubmit);

  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      const url = entry.name;
      if (ga4.isGa4Hit(url)) {
        const parsedResult = ga4.parse(url);
        show(parsedResult, Ga4Result);
        const gtagCommand = schemaRecommend.buildGa4GtagCommand(parsedResult);
        Ga4GtagCommand.value = gtagCommand;
        Ga4GtagCommand.rows = gtagCommand.split("\n").length + 1;
      }
      if (measurementProtocol.isUaLegacyHit(url)) {
        show(measurementProtocol.parse(url), UaLegacyResult);
      }
      if (measurementProtocol.isUaGa4Hit(url)) {
        show(measurementProtocol.parse(url), UaGa4Result);
      }
    });
  });
  observer.observe({ entryTypes: ["resource"] });
}

main();
