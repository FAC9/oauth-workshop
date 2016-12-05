const Hapi = require('hapi');
const inert = require('inert');
const querystring = require('querystring');
const Request = require('request');
const env = require('env2');

const server = new Hapi.Server();

env('./config.env');

server.connection ({
  port: 4000
});

server.register(inert, (err) => {
  if (err) throw err;

  server.state('GitHubCookie', {
    ttl: 60 * 60 * 1000,
    isSecure: false,
    isHttpOnly: false,
    encoding: 'base64json',
    clearInvalid: false,
    strictHeader: true
  });

  server.route([{
    method: 'GET',
    path: '/{file*}',
    handler: {
      directory: {
        path: 'public/'
      }
    }
  },
  {
    method: 'GET',
    path: '/login',
    handler: (req, reply) => {
      var queryString = querystring.stringify({
        client_id: process.env.CLIENT_ID,
        redirect_uri: process.env.BASE_URL + '/welcome',
        scope: 'user public_repo'
      });
      reply.redirect('https://github.com/login/oauth/authorize?' + queryString);
    }
  },
  {
    method: 'GET',
    path: '/welcome',
    handler: (req, reply) => {
      Request({
        url: 'https://github.com/login/oauth/access_token',
        method: 'POST',
        form: {
          client_id: process.env.CLIENT_ID,
          client_secret: process.env.CLIENT_SECRET,
          code: req.url.query.code
        }
      }, (err, res, body) => {
        if (err) throw err;
        reply(body).state('GitHubCookie', {
          token: querystring.parse(body).access_token
        });
      });
    }
  },
  {
    method: 'POST',
    path: '/send-issue',
    handler: (req, reply) => {
      Request({
        url: 'https://api.github.com/repos/FAC9/READMES/issues',
        method: 'POST',
        headers: {
          Authorization: 'token ' + req.state.GitHubCookie.token,
          'User-Agent': 'oauth-workshop'
        },
        body: JSON.stringify({
          title: req.payload.title,
          body: req.payload.body
        })
      }, (err, res) => {
        if (err) throw err;
          console.log(res.body);
      })
    }
  }
]);
});

server.start( (err) => {
  if (err) throw err;
  console.log(`server is running on: ${server.info.uri}`);
});
