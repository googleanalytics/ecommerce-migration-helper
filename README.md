# Ecommerce Migration Helper

This tool helps to identify which product and tool you are currently using to
send ecommerce events to Google Analytics, how those events are interpreted by
Google Analytics tags in Google Tag Manager, and how to migrate the JavaScript
implementation of those events to Google's current recommendations.

## Using The Tool

1.  Select whether you're using gtag.js or Google Tag Manager.
1.  Enter the data for the event you want to send, as it appears in your web
    site's current code.
1.  (Optional) Set Google Analytics 4 and Universal Analytics property IDs to
    send data to, if you want to see results in a Google Analytics report.
1.  Press the "Submit Test" button.
1.  Wait for results to appear in the result boxes.

## Identification

The tool will examine the data you entered and attempt to identify whether it's
using the Universal Analytics, or Google Analytics 4 data format. Additionally,
it will attempt to identify which tagging solution was used.

## Interpretation

The tool shows how the data is interpreted by Google Analytics 4 and Universal
Analytics tags in GTM that have enabled reading Ecommerce data from the data
layer.

This tool can assist in migration by checking that Google Analytics is
receiving the same data in UA and GA4 for a given event. It can also help
check that a tag is receiving the same data before and after migration.

## Recommendations

The tool recommends how the same data can be sent to GA4 following the current
GA4 documentation.

If you're migrating from ecommerce events another format, this can help
understand how data in your existing events maps to the GA4 documentation.

If you're already using the gtag API and the GA4 format, you likely won't have
to make any changes.
