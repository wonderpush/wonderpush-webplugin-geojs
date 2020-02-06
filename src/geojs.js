(function () {

  /**
   * WonderPush GeoJS plugin 
   * @class GeoJS
   * @param {external:WonderPushPluginSDK} WonderPushSDK - The WonderPush SDK instance provided automatically on intanciation.
   * @param {GeoJS.Options} options - The plugin options.
   */
  /**
   * @typedef {Object} GeoJS.Options
   * @property {Number} [cacheDuration] - Sets a duration in milliseconds for the geolocation cache. Set to 0 to avoid caching. Defaults to 3600000 (1h).
   */
  /**
   * The WonderPush JavaScript SDK instance.
   * @external WonderPushPluginSDK
   * @see {@link https://wonderpush.github.io/wonderpush-javascript-sdk/latest/WonderPushPluginSDK.html|WonderPush JavaScript Plugin SDK reference}
   */
  WonderPush.registerPlugin("geojs", {
    window: function (WonderPushSDK, options) {
      window.WonderPush = window.WonderPush || [];
      options = options || {};
      var translations = {
        "fr": {},
        "es": {},
        "it": {},
        "pt": {},
        "de": {},
      };
      /**
       * Translates the given text
       * @param text
       * @returns {*}
       */
      var _ = function (text) {
        var language = (navigator.language || '').split('-')[0];
        if (translations.hasOwnProperty(language) && translations[language][text]) return translations[language][text];
        return text;
      };

      var fetchGeolocation = function () {
        return new Promise(function (resolve, reject) {
          var url = "https://get.geojs.io/v1/ip/geo.json";
          var oReq = new XMLHttpRequest();
          oReq.addEventListener("load", function () {
            resolve(JSON.parse(this.responseText));
          });
          oReq.addEventListener('error', function (error) {
            reject(error);
          });
          oReq.addEventListener('abort', function (error) {
            reject(error);
          });
          oReq.open("GET", url);
          oReq.send();
        });
      };

      var updateGeolocationProperties = function (geoLocation) {
        var city = geoLocation ? geoLocation.city || null : null;
        var country = geoLocation ? geoLocation.country || null : null;
        var country_code3 = geoLocation ? geoLocation.country_code3 || null : null;
        var country_code = geoLocation ? geoLocation.country_code || null : null;
        var region = geoLocation ? geoLocation.region || null : null;
        window.WonderPush.push(function () {
          var properties = {
            string_city: city,
            string_country: country,
            string_country_code3: country_code3,
            string_country_code: country_code,
            string_region: region,
          };
          window.WonderPush.putProperties(properties);
        });
      };


      var updateGeolocation = function () {
        var cacheDuration = options.cacheDuration === undefined ? 3600000 : typeof options.cacheDuration === 'number' ? options.cacheDuration : undefined;
        if (typeof cacheDuration === 'number' && cacheDuration > 0) {
          WonderPushSDK.Storage.get('lastFetchDate', 'geoLocation')
            .then(function (result) {
              var lastFetchDate = result ? result.lastFetchDate : undefined;
              var geoLocation = result ? result.geoLocation : undefined;
              var now = +new Date();
              var cacheExpired = !lastFetchDate || now - lastFetchDate > cacheDuration;
              var geoLocationPromise = (cacheExpired || !geoLocation) ? WonderPushSDK.Storage.set({lastFetchDate: now})
                  .then(fetchGeolocation)
                  .then(function (geoLocation) {
                    return WonderPushSDK.Storage.set({geoLocation: geoLocation})
                      .then(function () {
                        return geoLocation;
                      });
                  })
                : Promise.resolve(geoLocation);
              geoLocationPromise.then(updateGeolocationProperties).catch(function (error) {
                console.error(error);
              });
            });
        } else {
          fetchGeolocation()
            .then(function (geoLocation) {
              return WonderPushSDK.Storage.set({lastFetchDate: +new Date(), geoLocation: geoLocation})
                .then(function () {
                  return geoLocation;
                });
            })
            .then(updateGeolocationProperties)
            .catch(function (error) {
              console.error('Could not fetch geolocation', error);
            });
        }
      };

      // Handle subscription state changes
      window.addEventListener('WonderPushEvent', function (event) {
        if (!event.detail || !event.detail.state || event.detail.name !== 'subscription' || event.detail.state !== WonderPushSDK.SubscriptionState.SUBSCRIBED) {
          return;
        }
        updateGeolocation();
      });

      if (WonderPushSDK.Notification.getSubscriptionState() === WonderPushSDK.SubscriptionState.SUBSCRIBED) {
        updateGeolocation();
      }
    }
  });
})();
