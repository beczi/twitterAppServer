let express = require('express')
let request = require('request')
let querystring = require('querystring')
let bodyParser = require('body-parser')
let helpers = require('./helpers')

let app = express()

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.json());
app.use(express.urlencoded());

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Atid");
  next();
});

dummySecretStorage = {}

app.get('/login', function(req, res) {
  let url = 'https://api.twitter.com/oauth/request_token'
  let authOptions = {
    url: url,
    headers: {
      'Authorization': 'OAuth ' + helpers.getAppOauthHeaderValue(url, "POST")
    }
  }
  request.post(authOptions, function(error, response, body) {
    // console.log(body);
    let token = body.split('&')[0].split('=')[1]
    let secret = body.split('&')[1].split('=')[1]
    dummySecretStorage[token] = secret;
    let uri = process.env.FRONTEND_URI || 'http://localhost:8080'
    res.redirect("https://api.twitter.com/oauth/authenticate?oauth_token=" + token)
  })
})

app.get('/callback', function(req, res) {
  let code = req.query || null
  // console.log(code)

  let url = 'https://api.twitter.com/oauth/access_token?oauth_verifier=' + code.oauth_verifier;

  let authOptions = {
    url: url,
    headers: {
      'Authorization': 'OAuth ' + helpers.getUserOuathHeaderValue(
          url, "GET", code.oauth_token, dummySecretStorage[code.oauth_token])
    },
    json: true
  }
  request.get(authOptions, function(error, response, body) {
    // console.log(body);
    let token = body.split('&')[0].split('=')[1]
    let secret = body.split('&')[1].split('=')[1]
    dummySecretStorage[token] = secret;

    let url = 'http://localhost:8080?atid=';
    let authOptions = {
      url: url,
      headers: {
        'Authorization': 'OAuth ' + helpers.getUserOuathHeaderValue(
            url, "GET", token, secret)
      },
      json: true
    }
    let uri = 'http://localhost:8080/index#/?atid='
    res.redirect(uri  + token)
    request.get(authOptions, function(error, response, body) {
    //   console.log(body.errors);
    })
  })
})

app.get('/init', function(req, res) {
  let url = 'https://api.twitter.com/1.1/account/verify_credentials.json'
  let token = req.get("Atid") || null
  let authOptions = {
    url: url,
    headers: {
      'Authorization': 'OAuth ' + helpers.getUserOuathHeaderValue(
          url, "GET", token, dummySecretStorage[token])
    }
  }
  request.get(authOptions, function(error, response, body) {
        let data = JSON.parse(body),
            user_data = {
              name: data.name,
              login: data.screen_name,
              avatar: data.profile_image_url
          }
        //   console.log(user_data.name)

    return res.json(JSON.stringify(user_data))
  })
})

app.get('/followers', function(req, res) {
    let url = 'https://api.twitter.com/1.1/followers/list.json',
        token = helpers.getTokenFromRequest(req),
        oauthValue = helpers.getUserOuathHeaderValue(url, "GET", token, dummySecretStorage[token]),
        authOptions = helpers.buildAuthOptions(url, oauthValue);

    request.get(authOptions, function(error, response, body) {
        let data = JSON.parse(body);
        if(data.errors) {
              response = {
                  status: 'ERROR',
                  errors: helpers.getErrors(data.errors)
              }
              console.log("Followers " + response.errors);
        } else {
            response = {
                status: 'OK',
                data: data.users ? data.users.slice(0,5) : []
            }
            console.log("Followers " + response.status );

        }

        return res.json(JSON.stringify(response))
  })
})

app.get('/friends', function(req, res) {
  let url = 'https://api.twitter.com/1.1/friends/list.json'
  let token = req.get("Atid") || null
  let authOptions = {
    url: url,
    headers: {
      'Authorization': 'OAuth ' + helpers.getUserOuathHeaderValue(
          url, "GET", token, dummySecretStorage[token])
    }
  }
  request.get(authOptions, function(error, response, body) {
          let data = JSON.parse(body);

          if(data.errors) {
                response = {
                    status: 'ERROR',
                    errors: helpers.getErrors(data.errors)
                }
                console.log(response.status + " :" + response.errors);
          } else {
              response = {
                  status: 'OK',
                  data: data.users ? data.users : []
              }
              console.log("Followers " + response.status );
          }


    return res.json(JSON.stringify(response))
    })
})

app.get('/tweets', function(req, res) {
  let url = 'https://api.twitter.com/1.1/statuses/user_timeline.json'
  let token = req.get("Atid") || null
  let authOptions = {
    url: url,
    headers: {
      'Authorization': 'OAuth ' + helpers.getUserOuathHeaderValue(
          url, "GET", token, dummySecretStorage[token])
    }
  }
  request.get(authOptions, function(error, response, body) {
          let data = JSON.parse(body);

          if (data.errors) {
                response = {
                    status: 'ERROR',
                    errors: helpers.getErrors(data.errors)
                }
                console.log("Tweets " + response.errors[0]);
          } else {
              response = {
                  status: 'OK',
                  data: data ? data : []
              }
              console.log("Tweets " + response.status );
          }

    return res.json(JSON.stringify(response))
  })
})

app.post('/update', function(req, res) {
  let token = req.headers.atid || null
  let text = querystring.stringify(req.body);
  let url = 'https://api.twitter.com/1.1/statuses/update.json?' + text;

  let authOptions = {
    url: url,
    headers: {
      'Authorization': 'OAuth ' + helpers.getUserOuathHeaderValue(
          url, "POST", token, dummySecretStorage[token], req.body.status)
      },
    json: true
  }

  request.post(authOptions, function(error, response, body) {
      console.log(body)
      let result = 'ERROR';
      if (body.id) {
          result = 'OK';
      }

      res.json({'status': result})
      return res
  })
})

let port = process.env.PORT || 8888
console.log(`Listening on port ${port}. Go /login to initiate authentication flow.`)
app.listen(port)
