# Business Card Maker API [![Build Status](https://travis-ci.org/ghinda/bizcardmaker-api.png)](https://travis-ci.org/ghinda/bizcardmaker-api)

It handles:

* Integration with the Printchomp API
* Print-ready PDF generation - with color conversion - using ImageMagick and Ghostscript
* Detect invalid street addresses and offer suggestions before sending the Order to Printchomp - using the Google Maps Geocode API
* Newsletter subscription using the MailChimp API
* Minimal dashboard for seeing order stats


## OpenShift install

The OpenShift `pre_start` hook will install `ghostscript-9.14 64bit` in the `OPENSHIFT_DATA_DIR` folder.

For local development, make sure you have `ghostscript` installed and available in your path.


## Development Setup

Make sure you have the latest Node.js.

```
npm install -g nodemon
npm install
nodemon server.js
```

Run the tests with:

```
npm test
```


## Printchomp API docs

http://docs.printchomp.apiary.io/


## License

This projected is licensed under the terms of the GNU AFFERO GENERAL PUBLIC license.
