const {app, ipcMain} = require('electron')
var AWS = require('aws-sdk')
var db = require('better-sqlite3')(app.getPath('userData') + '/default.db')
var currentRegion = ''

class Rekognition {

  constructor() {

    // init the database
    db.prepare(`CREATE TABLE IF NOT EXISTS labels (id INTEGER NOT NULL PRIMARY KEY, object_id INTEGER NOT NULL, label TEXT NOT NULL, confidence REAL NOT NULL)`).run()

    ipcMain.on('rekognition-bucket-objects-send', (event, bucketName, objects) => {
      console.log(`rekognition-bucket-objects-send is called and bucketName=${bucketName} objects=${objects}`)
      this.rekognitionObjects(bucketName, objects)
    })

  }

  getRekognitionClient(bucketName="") {
    console.log(`getRekognitionClient is called and bucketName=${bucketName}`)
    const credential = db.prepare("SELECT * FROM credential").get()
    let endpoint = ""
    let params = {
      accessKeyId: credential.access_key_id,
      secretAccessKey: credential.secret_access_key,
    }
    const record = db.prepare("SELECT * FROM buckets WHERE bucket_name = ?").get(bucketName)
    if (credential.region == 'MainlandChina') {
      var currentRegion = 'cn-northwest-1'
      if (record && record.region == 'cn-north-1') {
        currentRegion = 'cn-north-1'
      }
      params.region = currentRegion
    } else {
      var currentRegion = 'ap-southeast-1'
      if (record) {
        currentRegion = record.region
      }
      params.region = currentRegion
    }
    //console.log(`new Rekognition client with params `, params)
    let client = new AWS.Rekognition(params)
    return client
  }

  rekognitionObjects(bucketName, objects) {
    let client = this.getRekognitionClient(bucketName)
    objects.forEach(object => {
      let params = {
        Image: {
          S3Object: {
            Bucket: bucketName,
            Name: object.Key
          }
        },
        MaxLabels: 10
      }
      client.detectLabels(params, function(err, response) {
        if (err) {
          console.log(err, err.stack)
        } else {
          console.log(`Detected labels for: ${object.Key}`)
          response.Labels.forEach(label => {
            console.log(`Label:      ${label.Name}`)
            console.log(`Confidence: ${label.Confidence}`)
            console.log("Instances:")
            label.Instances.forEach(instance => {
              let box = instance.BoundingBox
              console.log("  Bounding box:")
              console.log(`    Top:        ${box.Top}`)
              console.log(`    Left:       ${box.Left}`)
              console.log(`    Width:      ${box.Width}`)
              console.log(`    Height:     ${box.Height}`)
              console.log(`  Confidence: ${instance.Confidence}`)
            })
            console.log("Parents:")
            label.Parents.forEach(parent => {
              console.log(`  ${parent.Name}`)
            })
            console.log("------------")
            console.log("")

            // write object to table
            const objectRecord = db.prepare("SELECT * FROM objects WHERE object_key = ?").get(object.Key)
            //console.log(objectRecord)
            let objectId
            if (!objectRecord) {
              const bucketRecord = db.prepare("SELECT id FROM buckets WHERE bucket_name = ?").get(bucketName)
              if (bucketRecord.id) {
                const info = db.prepare("INSERT INTO objects (bucket_id, object_key) VALUES (?, ?)").run(bucketRecord.id, object.Key)
                objectId = info.lastInsertRowid
              }
            } else {
              objectId = objectRecord.id
            }

            // write label to talbe
            if (label.Confidence >= 60) {
              const checkRecord = db.prepare("SELECT count(*) as num FROM labels WHERE object_id = ? AND label = ?").get(objectId, label.Name)
              //console.log(`checkRecord`, checkRecord)
              if (checkRecord.num == 0) {
                db.prepare("INSERT INTO labels (object_id, label, confidence) VALUES (?, ?, ?)").run(objectId, label.Name.toLowerCase(), label.Confidence)
              }
            }
          })
        }
      })
    })
  }

}

exports.Rekognition = Rekognition
