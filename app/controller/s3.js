const {app, ipcMain} = require('electron')
const {DataCache} = require('../service/data-cache')
const {STS} = require('./sts')
const AWS = require('aws-sdk')
const db = require('better-sqlite3')(app.getPath('userData') + '/default.db')
const tool = require('../service/tool')
const i18n = require('../service/i18n')

class S3 {

  constructor() {

    let lang = app.getLocale() == 'zh-CN' ? 'zh-CN' : 'en'

    i18n.changeLanguage(lang)

    this.identityCache = new DataCache(new STS().getIdentity)

    this.allKeys = []

    // init the database
    db.prepare(`CREATE TABLE IF NOT EXISTS uploads (id INTEGER NOT NULL PRIMARY KEY, file_name TEXT NOT NULL, progress INTEGER NOT NULL, create_time TEXT, update_time TEXT)`).run()
    db.prepare(`CREATE TABLE IF NOT EXISTS buckets (id INTEGER NOT NULL PRIMARY KEY, bucket_name TEXT NOT NULL, region TEXT NOT NULL)`).run()
    db.prepare(`CREATE TABLE IF NOT EXISTS objects (id INTEGER NOT NULL PRIMARY KEY, bucket_id INTEGER NOT NULL, object_key TEXT NOT NULL)`).run()

    ipcMain.on('fetch-buckets-send', (event) => {
      console.log(`fetch-buckets-send is called`)

      this.fetchBuckets().then((result) => {
        let finalBuckets = []
        let counter = 0 
        if (false) {
          event.sender.send('fetch-buckets-response', result)
        } else {
          let buckets = result.Buckets
          buckets.forEach((bucket, index, buckets) => {
            let ret = this.headBucket(bucket.Name).then((ret) => {
              finalBuckets.push(bucket)
              counter++
              if (counter == buckets.length) {
                finalBuckets = finalBuckets.sort(function(s, t) {
                  let a = s.Name.toLowerCase()
                  let b = t.Name.toLowerCase()
                  if (a < b) return -1
                  if (a > b) return 1
                  return 0
                })
                result.Buckets = finalBuckets
                event.sender.send('fetch-buckets-response', result)
              }
            }).catch((error) => {
              console.log(error.statusCode)
              if (error.statusCode != 403) {
                finalBuckets.push(bucket)
              }
              counter++
              if (counter == buckets.length) {
                finalBuckets = finalBuckets.sort(function(s, t) {
                  let a = s.Name.toLowerCase()
                  let b = t.Name.toLowerCase()
                  if (a < b) return -1
                  if (a > b) return 1
                  return 0
                })
                result.Buckets = finalBuckets
                event.sender.send('fetch-buckets-response', result)
              }
            })
          })
        }
      }).catch((error) => {
        event.sender.send('error-alert', i18n.t("error." + error.code))
      })
    })

    ipcMain.on('get-bucket-region-send', (event, bucketName) => {
      //console.log(`get-bucket-region-send is called and bucketName=${bucketName}`)
      this.getBucketRegion(bucketName).then((result) => {
        event.sender.send('get-bucket-region-' + bucketName + '-response', result)
      }).catch((error) => {
        event.sender.send('error-alert', i18n.t("error." + error.code))
      })
    })

    ipcMain.on('get-bucket-public-access-block-send', (event, bucketName) => {
      console.log(`get-bucket-public-access-block-send is called and bucketName=${bucketName}`)
      this.getBucketPublicAccessBlock(bucketName).then((result) => {
        let ret = ''
        let confSet = result.PublicAccessBlockConfiguration
        if (confSet.BlockPublicAcls && confSet.BlockPublicPolicy) {
          ret = i18n.t("buckets.access.bucketAndObjectsNotPublic")
        } else {
          ret = i18n.t("buckets.access.objectsCanBePublic")
        }
        event.sender.send('get-bucket-public-access-block-' + bucketName + '-response', ret)
      }).catch((error) => {
        this.getAccountPublicAccessBlock().then((result) => {
            let ret = ''
            let confSet = result.PublicAccessBlockConfiguration
            if (confSet.BlockPublicAcls && confSet.BlockPublicPolicy) {
              ret = i18n.t("buckets.access.bucketAndObjectsNotPublic")
            } else {
              ret = i18n.t("buckets.access.objectsCanBePublic")
            }
            event.sender.send('get-bucket-public-access-block-' + bucketName + '-response', ret)
        }).catch((error) => {
            console.log(`error `, error)
            event.sender.send('error-alert', i18n.t("error." + error.code))
        })
      })
    })

    ipcMain.on('fetch-bucket-objects-send', (event, bucketName, prefix, keyword, style) => {
      console.log(`fetch-bucket-objects-send is called and bucketName=${bucketName} prefix=${prefix} keyword=${keyword}`)
      if (keyword && style == 'icons') {
        let scope = this.getBucketObjectsByLabel(bucketName, prefix, keyword)
        let bucketParams = {
          Bucket : bucketName,
          Prefix : prefix,
          Delimiter : '/'
        }
        this.getBucketObjects(bucketParams).then((result) => {
          let tmpContents = []
          result.Contents.forEach(object => {
            if (scope.includes(object.Key)) {
              tmpContents.push(object)
            }
          })
          result.Contents = tmpContents
          result.CommonPrefixes = []
          event.sender.send('fetch-bucket-objects-response', result, prefix)
        }).catch((error) => {
          event.sender.send('error-alert', i18n.t("error." + error.code))
        })
      } else {
        if (keyword) {
          prefix += keyword
        }
        let bucketParams = {
          Bucket : bucketName,
          Prefix : prefix,
          Delimiter : '/'
        }
        this.getBucketObjects(bucketParams).then((result) => {
          event.sender.send('fetch-bucket-objects-response', result, prefix)
        }).catch((error) => {
          event.sender.send('error-alert', i18n.t("error." + error.code))
        })
      }
    })

    ipcMain.on('on-drag-start', (event, bucketName, keyValue) => {
      console.log(`on-drag-start is called and bucketName=${bucketName} keyValue=${keyValue}`)
      this.getPresignedUrl(bucketName, keyValue).then((url) => {
        console.log("tmp path is:", app.getPath("temp"))
        console.log("presignedUrl is " + url)


        let tmpFile = app.getPath("temp") + keyValue
        this.downloadFromUrl(url, tmpFile, () => {
          event.sender.startDrag({
            file: tmpFile,
            //icon: __dirname+"/../../s3.ico"
            icon: __dirname+"/../../s3.ico"
          })
        })
      }).catch((error) => {
        event.sender.send('error-alert', i18n.t("error." + error.code))
      })
    })

    ipcMain.on('on-drop-start', (event, bucketName, prefix, filePath) => {
      console.log(`on-drop-start is called and bucketName=${bucketName} prefix=${prefix} filePath=${filePath}`)

      this.uploadObjects(bucketName, prefix, filePath).then((result) => {
        event.sender.send('refresh-bucket-objects', bucketName, prefix)
      }).catch((error) => {
        event.sender.send('error-alert', i18n.t("error." + error.code))
      })
    })

    ipcMain.on('create-bucket-folder-send', (event, bucketName, prefix, folderName) => {
      console.log(`create-bucket-folder-send is called and bucketName=${bucketName} prefix=${prefix} folderName=${folderName}`)

      this.uploadObjects(bucketName, prefix, folderName).then((result) => {
        event.sender.send('refresh-bucket-objects', bucketName, prefix)
      }).catch((error) => {
        event.sender.send('error-alert', i18n.t("error." + error.code))
      })
    })

    ipcMain.on('upload-bucket-objects-send', (event, bucketName, prefix, type) => {
      console.log(`upload-bucket-objects-send is called and bucketName=${bucketName} prefix=${prefix} type=${type}`)

      const {dialog} = require('electron');
      let fs = require('fs')
      let path = require('path')
      let selectedPaths = ''
      if (type == 'objects') {
        selectedPaths = dialog.showOpenDialogSync({properties: ['openFile', 'multiSelections'] })
      } else {
        selectedPaths = dialog.showOpenDialogSync({properties: ['openDirectory', 'multiSelections'] })
      }
      console.log(`selectedPaths `, selectedPaths)
      if (selectedPaths) {
        event.sender.send('upload-bucket-objects-start-response')
        selectedPaths.forEach(selectedPath => {

          let parentPath = path.resolve(selectedPath, '..')

          tool.walkPathSync(selectedPath, function(filePath, stat) {
            let subPrefix
            if (process.platform == 'win32' || true) {
              subPrefix = filePath.replace(parentPath + path.sep, "").replace(path.basename(filePath), "").replaceAll(path.sep, "/")
            } else {
              subPrefix = filePath.replace(parentPath + path.sep, "").replace(path.basename(filePath), "")
            }
            this.uploadObjects(bucketName, prefix + subPrefix, filePath).then((result) => {
              event.sender.send('upload-bucket-objects-finish-response', result)
              event.sender.send('refresh-bucket-objects', bucketName, prefix)
            }).catch((error) => {
              event.sender.send('error-alert', i18n.t("error." + error.code))
            })
          }.bind(this))
        })
      }
    })

    ipcMain.on('download-bucket-objects-send', (event, bucketName, prefix, objects) => {
      console.log(`download-bucket-objects-send is called and bucketName=${bucketName} prefix=${prefix} objects=`, objects)

      const {dialog} = require('electron');
      let path = require('path')
      let fs = require('fs')

      let options = {
        buttonLabel: i18n.t("save"),
        properties: ['openDirectory']
      }
      let downloadFolder = dialog.showOpenDialogSync(options)
      console.log("downloadFolder is " + downloadFolder)
      if (downloadFolder) {
        objects.forEach(object => {
          if (object.Type == 'folder') {
            let bucketParams = {
              Bucket : bucketName,
              Prefix : object.Key,
            }
            this.allKeys = []
            this.listAllKeys(bucketParams).then((keys) => {
              console.log(`keys is `, keys)
              keys.forEach((key) => {
                if (key.replace(prefix, "").slice(-1) == "/") {
                  //console.log(key.replace(prefix, "") + " is folder")
                } else {
                  //console.log(key.replace(prefix, "") + " is object")
                  //let objectName = key.replace(prefix, "").split("/").pop()
                  this.getPresignedUrl(bucketName, key).then((url) => {
                    let dest = downloadFolder + path.sep + key.replace(prefix, "")
                    console.log("dest is " + dest + " and mkdir " + dest.replace(dest.split("/").pop(), ""))
                    fs.mkdirSync(dest.replace(dest.split("/").pop(), ""), { recursive: true })
                    console.log("now dest is ", dest)
                    this.downloadFromUrl(url, dest).then(() => {
                      event.sender.send('download-bucket-objects-finish-response', key)
                    })
                    event.sender.send('download-bucket-objects-start-response', key)
                  }).catch((error) => {
                    event.sender.send('error-alert', i18n.t("error." + error.code))
                  })

                }
              })
            })
          } else {
            this.getPresignedUrl(bucketName, object.Key).then((url) => {
              this.downloadFromUrl(url, downloadFolder + path.sep + object.Name).then(() => {
                event.sender.send('download-bucket-objects-finish-response', object.Key)
              })
              event.sender.send('download-bucket-objects-start-response', object.Key)
            }).catch((error) => {
              event.sender.send('error-alert', i18n.t("error." + error.code))
            })
          }
        })
      }
    })

    ipcMain.on('delete-bucket-objects-send', (event, bucketName, keys) => {
      console.log(`delete-bucket-objects-send is called and bucketName=${bucketName} keys=`, keys)
      let objects = []
      keys.forEach(item => {
        if (item.Type == 'object') {
          objects.push({Key: item.Key})
        } else {
          let bucketParams = {
            Bucket : bucketName,
            Prefix : item.Key,
          }
          this.allKeys = []
          this.listAllKeys(bucketParams).then((keys) => {
            console.log(`keys is `, keys)
            let folderObjects = []
            keys.forEach((key) => {
              folderObjects.push({Key: key})
            })
            this.deleteObjects(bucketName, folderObjects).then((result) => {
              //event.sender.send('delete-bucket-objects-response')
            }).catch((error) => {
              event.sender.send('error-alert', i18n.t("error." + error.code))
            })
          })
        }
      })

      if (objects.length > 0) {
        this.deleteObjects(bucketName, objects).then((result) => {
          event.sender.send('delete-bucket-objects-response')
        }).catch((error) => {
          event.sender.send('error-alert', i18n.t("error." + error.code))
        })
      } else {
        event.sender.send('delete-bucket-objects-response')
      }
    })

    ipcMain.on('share-bucket-objects-send', (event, bucketName, objects, expireType, expireValue) => {
      console.log(`share-bucket-objects-send is called and bucketName=${bucketName} objects=${objects} expireType=${expireType} expireValue=${expireValue}`)

      objects.forEach(object => {
        let filePath = object.Key
        this.getPresignedUrl(bucketName, filePath, expireType, expireValue).then((url) => {
          event.sender.send('share-bucket-objects-response', filePath, url)
        }).catch((error) => {
          event.sender.send('error-alert', i18n.t("error." + error.code))
        })
      })
    })

    ipcMain.on('get-upload-list-send', (event) => {
      console.log(`get-upload-list-send is called`)
      this.getUploadList().then((result) => {
        event.sender.send('get-upload-list-response', result)
      }).catch((error) => {
        event.sender.send('error-alert', i18n.t("error." + error.code))
      })
    })

    ipcMain.on('delete-upload-record-send', (event, record_id) => {
      console.log(`delete-upload-record-send is called`)
      this.deleteUploadRecord(record_id)
    })

    ipcMain.on('get-object-url-send', (event, bucketName, keyValue) => {
      console.log(`get-object-url-send is called and bucketName=${bucketName} keyValue=${keyValue}`)
      this.getPresignedUrl(bucketName, keyValue, 'day', 7).then((result) => {
        event.sender.send(`get-object-${bucketName}-${keyValue}-url-response`, result)
      }).catch((error) => {
        event.sender.send('error-alert', i18n.t("error." + error.code))
      })
    })

    ipcMain.on('make-object-public-send', (event, bucketName, prefix, objects) => {
      console.log(`make-object-public-send is called and bucketName=${bucketName} prefix=${prefix} objects=`, objects)

      objects.forEach(object => {
        if (object.Type == 'folder') {
          let bucketParams = {
            Bucket : bucketName,
            Prefix : object.Key,
          }
          this.allKeys = []
          this.listAllKeys(bucketParams).then((keys) => {
            console.log(`keys is `, keys)
            keys.forEach((key) => {
              if (key.replace(prefix, "").slice(-1) != "/") {
                this.makeObjectPublic(bucketName, key).then((result) => {
                  event.sender.send(`make-object-public-response`, object.Key.slice(0, -1).split("/").pop())
                }).catch((error) => {
                  event.sender.send('error-alert', i18n.t("error." + error.code))
                })
              }
            })
          })
        } else {
          this.makeObjectPublic(bucketName, object.Key).then((result) => {
            event.sender.send(`make-object-public-response`, object.Name)
          }).catch((error) => {
            event.sender.send('error-alert', i18n.t("error." + error.code))
          })
        }
      })
    })
  }

  getS3Client(bucketName="") {
    //console.log(`getS3Client is called and bucketName=${bucketName}`)
    let endpoint = ""
    let params = {
      apiVersion: '2006-03-01',
      signatureVersion: 'v4',
      useDualstack: true
    }
    const credential = db.prepare("SELECT * FROM credential").get()
    if (credential !== undefined && 'access_key_id' in credential && 'secret_access_key' in credential) {
      params.accessKeyId = credential.access_key_id
      params.secretAccessKey = credential.secret_access_key
    }
    const record = db.prepare("SELECT * FROM buckets WHERE bucket_name = ?").get(bucketName)
    if (credential !== undefined && credential.region == 'MainlandChina') {
      params.region = record ? record.region : 'cn-north-1'
    } else {
      params.region = record ? record.region : 'ap-southeast-1'
    }
    let s3 = new AWS.S3(params)
    return s3
  }

  getS3ControlClient() {
    let params = {
      apiVersion: '2018-08-20',
      signatureVersion: 'v4',
      useDualstack: true
    }
    const credential = db.prepare("SELECT * FROM credential").get()
    if (credential !== undefined && 'access_key_id' in credential && 'secret_access_key' in credential) {
      params.accessKeyId = credential.access_key_id
      params.secretAccessKey = credential.secret_access_key
    }
    if (credential !== undefined && credential.region == 'MainlandChina') {
      params.region = 'cn-northwest-1'
    } else {
      params.region = 'ap-southeast-1'
    }
    let s3Control = new AWS.S3Control(params)
    return s3Control
  }

  fetchBuckets() {
    console.log(`fetchBuckets is called`)
    let s3 = this.getS3Client()
    let promise = new Promise((resolve, reject) => {
      s3.listBuckets(function(err, data) {
        if (err) {
          reject(err)
        } else {
          //console.log(data)
          resolve(data)
        }
      })
    })
    return promise
  }

  headBucket(bucketName, owner='') {
    console.log(`headBucket is called`)
    let s3 = this.getS3Client(bucketName)
    let params = {
      Bucket: bucketName
    }
    if (owner) {
      params.ExpectedBucketOwner = owner
    }
    let promise = new Promise((resolve, reject) => {
      s3.headBucket(params, function(err, data) {
        if (err) {
          reject(err)
        } else {
          resolve(data)
        }
      })
    })
    return promise
  }

  getBucketRegion(bucketName) {
    console.log(`getBucketRegion is called and bucketName=${bucketName}`)
    let s3 = this.getS3Client()
    let promise = new Promise((resolve, reject) => {
      const record = db.prepare("SELECT * FROM buckets WHERE bucket_name = ?").get(bucketName)
      if (record && record.region) {
        var data = {"LocationConstraint": record.region}
        resolve(data)
      } else {
        var params = {
          Bucket: bucketName
        }
        s3.getBucketLocation(params, function(err, data) {
          if (err) {
            reject(err)
          } else {
            if (data) {
              if (data.LocationConstraint == '') {
                data.LocationConstraint = 'us-east-1'
              }
              db.prepare("INSERT INTO buckets (bucket_name, region) VALUES (?, ?)").run(bucketName, data.LocationConstraint)
            }
            resolve(data)
          }
        })
      }
    })
    return promise
  }

  getBucketPublicAccessBlock(bucketName) {
    console.log(`getBucketPublicAccessBlock is called and bucketName=${bucketName}`)
    let s3 = this.getS3Client(bucketName)
    let promise = new Promise((resolve, reject) => {
      var params = {
        Bucket: bucketName,
        //ExpectedBucketOwner: ""
      }
      s3.getPublicAccessBlock(params, function(err, data) {
        if (err) {
          reject(err)
        } else {
          resolve(data)
        }
      })
    })
    return promise
  }

  getAccountPublicAccessBlock() {
    let s3Control = this.getS3ControlClient()
    let promise = new Promise((resolve, reject) => {
      this.identityCache.getData().then((result) => {
        let params = {
          AccountId: result.Account
        }
        s3Control.getPublicAccessBlock(params, function(err, data) {
          if (err) {
            reject(err)
          } else {
            resolve(data)
          }
        })
      })
    })
    return promise
  }

  getBucketObjects(bucketParams) {
    console.log(`getBucketObjects is called and bucketParams `, bucketParams)
    let s3 = this.getS3Client(bucketParams.Bucket)
    let promise = new Promise((resolve, reject) => {
      s3.listObjectsV2(bucketParams, function(err, data) {
        if (err) {
          reject(err)
        } else {
          data.Href = this.request.httpRequest.endpoint.href;
          //console.log(`getBucketObjects response `, data)
          resolve(data)
        }
      })
    })
    return promise
  }

  getPresignedUrl(bucketName, keyValue, expireType='day', expireValue='1') {
    console.log(`getPresignedUrl is called and bucketName=${bucketName} keyValue=${keyValue} expireType=${expireType} expireValue=${expireValue}`)
    let s3 = this.getS3Client(bucketName)
    if (expireType == 'day') {
      expireValue = Number(expireValue)*86400
    } else if (expireType == 'hour') {
      expireValue = Number(expireValue)*3600
    } else if (expireType == 'minute') {
      expireValue = Number(expireValue)*60
    } else {
      expireValue = 86400
    }
    console.log(`final expireValue is ${expireValue} `)
    let params = {
      Bucket: bucketName,
      Key: keyValue,
      Expires: expireValue
    }
    let promise = s3.getSignedUrlPromise('getObject', params);
    return promise
  }

  uploadObjects(bucketName, prefix, filePath) {
    console.log(`uploadObjects is called and bucketName=${bucketName} prefix=${prefix} filePaths=${filePath}`)
    let s3 = this.getS3Client(bucketName)
    let fs = require('fs')
    let mime = require('mime')
    let path = require('path');
    let promise = new Promise((resolve, reject) => {

      let recordId = 0
      let uploadParams = {Bucket: bucketName, Key: '', Body: ''}
      let fileStream = ''
      if (filePath.indexOf('/') != -1 || filePath.indexOf('\\') != -1) {

        // write the record to sqlite
        const info = db.prepare("INSERT INTO uploads (file_name, progress, create_time) VALUES (?, ?, ?)").run(path.basename(filePath), 0, new Date().toISOString().replace('T', ' ').substr(0, 19))
        recordId = info.lastInsertRowid

        fileStream = fs.createReadStream(filePath)
        fileStream.on('error', function(err) {
          console.log(`File Error ${err}`)
        })
        uploadParams.Body = fileStream
        uploadParams.Key = prefix + path.basename(filePath)
        uploadParams.ContentType = mime.getType(filePath)

      } else {
        uploadParams.Key = prefix + filePath + '/'
      }
      s3.upload(uploadParams, function (err, data) {
        if (err) {
          reject(err)
        } if (data) {
          resolve(data)
        }
      }).on('httpUploadProgress', function(progress) {

        if (filePath.indexOf('/') != -1 || filePath.indexOf('\\') != -1) {
          let progressPercentage = Math.round(progress.loaded / progress.total * 100);
          console.log(`The progressPercentage is ${progressPercentage}`);

          //update the db and response to view
          db.prepare("UPDATE uploads SET progress = ? WHERE id = ?").run(progressPercentage, recordId)

          const window = require('electron').BrowserWindow
          let focusedWindow = window.getAllWindows()[0]

          this.getUploadList().then((result) => {
            console.log(`Update percent`)
            focusedWindow.webContents.send('get-upload-list-response', result)
          })

          if (progressPercentage < 100) {
            console.log(`The progress is ${progressPercentage}`)
          } else if (progressPercentage == 100) {
          }
        }

      }.bind(this))
    }).catch(error => {
      console.log(error)
    })

    return promise
  }

  deleteObjects(bucketName, objects) {
    console.log(`deleteObjects is called and bucketName=${bucketName} objects=${objects}`)
    let s3 = this.getS3Client(bucketName)
    let promise = new Promise((resolve, reject) => {
      let params = {
        Bucket: bucketName,
        Delete: {
          Objects: objects
        }
      }
      s3.deleteObjects(params, function(err, data) {
        if (err) {
          reject(err)
        } else {
          console.log(`Delete over ${data}`)
          resolve(data)
        }
      })
    })
    return promise
  }

  makeObjectPublic(bucketName, keyValue) {
    console.log(`makeObjectPublic is called and bucketName=${bucketName} keyValue=${keyValue}`)
    let s3 = this.getS3Client(bucketName)
    let promise = new Promise((resolve, reject) => {
      let params = {
        Bucket: bucketName,
        Key: keyValue,
        ACL: 'public-read'
      }
      s3.putObjectAcl(params, function(err, data) {
        if (err) {
          reject(err)
        } else {
          resolve(data)
        }
      })
    })
    return promise
  }

  downloadFromUrl(url, dest, cb) {
    console.log(`downloadFromUrl is called and url=${url} dest=${dest} cb=${cb}`)
    let https = require('https')
    let fs = require('fs')
    let path = require('path')
    let file = fs.createWriteStream(dest)
    let promise = new Promise((resolve, reject) => {
      let request = https.get(url, function(response) {
        response.pipe(file)
        file.on('finish', function() {
          file.close(cb)
          resolve()
        })
      }).on('error', function(err) {
        console.log(`file download error ${err.message}`)
        fs.unlink(dest)
        if (cb) {
          cb(err.message)
        }
      })
    })
    return promise
  }

  getUploadList() {
    console.log(`getUploadList is called`)
    let promise = new Promise((resolve, reject) => {
      const rows = db.prepare("SELECT * FROM uploads ORDER BY id DESC").all()
      resolve(rows)
    })
    return promise
  }

  deleteUploadRecord(record_id) {
    console.log(`deleteUploadRecord is called`)
    const rows = db.prepare("DELETE FROM uploads WHERE id = ?").run(record_id)
  }

  getBucketObjectsByLabel(bucketName, prefix, keyword) {
    const labels = db.prepare("SELECT * FROM labels").all()
    //console.log(`--------labels--------`)
    //console.log(labels)
    const records = db.prepare("SELECT * FROM objects CROSS JOIN buckets ON objects.bucket_id = buckets.id CROSS JOIN labels ON objects.id = labels.object_id WHERE buckets.bucket_name = ? AND objects.object_key LIKE (? || '%') AND labels.label = ?").all(bucketName, prefix, keyword.toLowerCase())
    let scope = []
    records.forEach(object => {
      scope.push(object.object_key)
    })
    return scope
  }

  async listAllKeys(params){
    let s3 = this.getS3Client(params.Bucket)
    const response = await s3.listObjectsV2(params).promise();
    response.Contents.forEach(obj => this.allKeys.push(obj.Key));

    if (response.NextContinuationToken) {
      params.ContinuationToken = response.NextContinuationToken;
      await this.listAllKeys(params); // RECURSIVE CALL
    }
    //console.log(`current all keys `, this.allKeys)
    return this.allKeys
  }

}

exports.S3 = S3
