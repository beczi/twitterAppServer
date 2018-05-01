let uuidv1 = require('uuid/v1')
let oauthSignature = require('oauth-signature')
let config = require('./config')

const OAUTH_VERSION = "1.0";
const SIGNATURE_METHOD = "HMAC-SHA1";
const ERRORS = {
    215: "Wystąpił błąd podczas autoryzacji",
    88: "Przekroczony limit pobrań. Spróbuj ponownie później."
};

function serializeObject (obj) {
    let str = '';
    let test = [];
    for (let p in obj) {
        if (obj.hasOwnProperty(p)) {
             test.push(p + '=' + '"'+ obj[p] +'"');
        }
    }
    return test.join(', ');
}

function buildOauthHeader(baseURL, httpMethod, oauthToken, oauthSecret, status) {
  let d = new Date();
  let consumerSecret = config.twitterCredentials.consumerSecret;
  let seconds = Math.round(d.getTime() / 1000).toString();
  let parameters = {
    oauth_consumer_key: config.twitterCredentials.consumerKey,
    oauth_nonce: uuidv1(),
    oauth_signature_method: SIGNATURE_METHOD,
    oauth_timestamp: seconds,
    oauth_version: OAUTH_VERSION
  }
  if (status) {
      parameters['status'] = status;
  }

  if (oauthToken && oauthSecret) {
      parameters.oauth_token = oauthToken
      parameters.oauth_signature = oauthSignature.generate(
          httpMethod, baseURL, parameters, consumerSecret, oauthSecret);
  } else {
      parameters.oauth_signature = oauthSignature.generate(
          httpMethod, baseURL, parameters, consumerSecret);
  }

  parameters = serializeObject(parameters);
  return  parameters
}


module.exports = {
    buildAuthOptions: function(url, oauthValue) {
        return {
            url: url,
            headers: {'Authorization': 'OAuth ' + oauthValue}
        }
    },

    getTokenFromRequest: function(request) {
        return request.get("Atid")
    },

    getAppOauthHeaderValue: function(baseURL, httpMethod) {
        return buildOauthHeader(baseURL, httpMethod)
    },

    getUserOuathHeaderValue: function(
        baseURL, httpMethod, oauthToken, oauthSecret, status
    ) {
        return buildOauthHeader(
            baseURL, httpMethod, oauthToken, oauthSecret, status
        )
    },
    getErrors: function(errors) {
        let errorsMsg = [];
        errors.forEach(function(obj){
            errorsMsg.push(ERRORS[obj.code]);
        })
        return errorsMsg
    }
}
