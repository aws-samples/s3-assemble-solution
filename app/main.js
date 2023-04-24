// Modules to control application life and create native browser window
const {app, BrowserWindow} = require('electron')
const {ipcMain} = require('electron')
const {Credential} = require('./controller/credential')
const {S3} = require('./controller/s3')
const {InitModel} = require('./model/init')
const path = require('path')
const fs = require('fs')

function initDatabases() {

  const initModl = new InitModel()

  // If it is the first time to open the application after installation and the version is inconsistent, then delete the old database to rebuild it.
  // Get the user data directory
  const userDataPath = app.getPath('userData')
  // Get the version number of the current application
  const appVersion = app.getVersion()
  // Read the version number saved in the user data directory
  const versionFilePath = path.join(userDataPath, 'version.txt')
  let savedVersion = null
  try {
    savedVersion = fs.readFileSync(versionFilePath, 'utf-8')
  } catch (err) {
    console.error(err);
  }

  // If the version number is inconsistent, it means that the application is launched for the first time
  if (savedVersion !== appVersion) {
    console.log('This is the first time the application is launched.')

    // Get old database path
    const filePathToDelete = path.join(userDataPath, 'default.db')

    // Delete the old database to rebuild it
    try {
      fs.unlinkSync(filePathToDelete);
      initModl.init()
    } catch (err) {
      console.error(err)
    }

    // Update the version number saved in the user data directory
    fs.writeFileSync(versionFilePath, appVersion, 'utf-8')
  } else {
    console.log('The application is already launched before.')
  }
}

function initServices () {
  credential = new Credential()
  s3 = new S3()
}

function createWindow () {

  const nativeImage = require('electron').nativeImage
  var image = nativeImage.createFromPath(__dirname + '/assets/images/512x512.png')
  image.setTemplateImage(true)

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      devTools: false,
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: image
  })

  // and load the index.html of the app.
  mainWindow.loadFile('app/view/index.html')

  // Open the DevTools.
  //mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
// app.whenReady().then(createWindow)

app.on('ready', function() {
  initDatabases()
  initServices()
  createWindow()
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
