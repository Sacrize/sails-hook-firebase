const admin = require('firebase-admin');

module.exports = function (sails) {

  let config;

  return {
    defaults: {
      __configKey__: {
        serviceAccount: {
          type: 'service_account',
          project_id: '',
          private_key_id: '',
          private_key: '',
          client_email: '',
          client_id: '',
          auth_uri: 'https://accounts.google.com/o/oauth2/auth',
          token_uri: 'https://oauth2.googleapis.com/token',
          auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
          client_x509_cert_url: '',
        },
        databaseURL: '',
        auth: {
          enableToken: true,
        }
      }
    },
    configure: function () {
      config = sails.config[this.configKey];
    },
    initialize: function () {
      sails.log.info('Initializing hook (`firebase`)');
      for (let k of Object.keys(config.serviceAccount)) {
        if (!config.serviceAccount[k]) {
          throw new Error('Configuration for firebase is missing');
        }
      }
      admin.initializeApp({
        credential: admin.credential.cert(config.serviceAccount),
        databaseURL: config.databaseURL,
      });
    },
    routes: {
      before: {
        '/*': async function (req, res, next) {
          if (!config.auth.enableToken) {
            return next();
          }
          if (false === _.isString(req.headers.authorization)) {
            return next();
          }
          let temp = req.headers.authorization.split(' ');
          if (temp.length !== 2 || (temp[0] !== 'Bearer')) {
            sails.log.error(new Error('Invalid authorization header'));
            return next();
          }
          let decodedToken = await admin.auth().verifyIdToken(temp[1]);
          if (!decodedToken) {
            sails.log.error(new Error('Invalid authorization token'));
            return next();
          }
          req.isJWT = true;
          req.tokenClaims = decodedToken;
          return next();
        }
      }
    },
    admin,
  }

}
