const i18n = require('i18next')
const Backend = require('i18next-fs-backend')
const i18nextOptions = {
  initImmediate: false,
  lng: 'en',
  ns: 'translation',
  setJqueryExt: true,
  backend: {
    loadPath: __dirname + "/../locales/{{lng}}/{{ns}}.json"
  }
}

i18n.use(Backend).init(i18nextOptions)

module.exports = i18n
