// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

breadcrumbStack = []

electron = require('electron')
ipcRenderer = electron.ipcRenderer
tool = require('../service/tool')
i18n = require('../service/i18n')

ipcRenderer.send('get-i18n-language-send')
ipcRenderer.once('get-i18n-language-response', (event, lang) => {

  i18n.changeLanguage(lang)

  globalCredential = require('./subviews/credential/credential')

  globalObjects = require('./subviews/objects/objects')

  globalBuckets = require('./subviews/buckets/buckets')

  globalWrapper = require('./subviews/wrapper/wrapper')

  globalWrapper.loadWrapper()

})
