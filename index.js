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
          userModel: 'user',
          firebaseUidAttribute: 'firebaseUid',
        }
      }
    },
    configure: function () {
      if (!sails.models[config.auth.userModel]) {
        sails.log.error(new Error('Not found model `'+config.auth.userModel+'`'));
        config.auth.enableToken = false;
      }
      if (!sails.models[config.auth.userModel].attributes[config.auth.firebaseUidAttribute]) {
        sails.log.error(new Error('Not found attribute `'+config.auth.firebaseUidAttribute+'` in model `'+config.auth.userModel+'`'));
        config.auth.enableToken = false;
      }
    },
    initialize: function () {
      config = sails.config[this.configKey];
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
          try {
            let decodedToken = await admin.auth().verifyIdToken(temp[1]);
            if (!decodedToken) {
              sails.log.error(new Error('Invalid authorization token'));
              return next();
            }
            let user = await sails.models[config.auth.userModel].findOne().where({ [config.auth.firebaseUidAttribute]: decodedToken.uid, });
            if (user) {
              req.me = user;
              req.isJwt = true;
            }
          } catch (e) {
              sails.log.error(e);
          }
          return next();
        }
      }
    },
    admin,
  }

}
