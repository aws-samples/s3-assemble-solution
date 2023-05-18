function listBucketObjects(event) {

  console.log(arguments.callee.name + " is called")

  // Switch action buttons for object view
  $("#bucket_buttons").hide()
  $("#object_buttons").show()

  let bucketName = event.data.bucketName
  let prefix = event.data.prefix
  let keyword = event.data.keyword
  let style = event.data.style
  if (!style) {
    style = $(".objects-style.active").find("input").val()
  }

  let Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000
  });

  // Play the breadcrumb game
  if (!keyword) {
    let breadcrumbAction = "push"
    breadcrumbStack.forEach((item, idx, array) => {
      if (prefix == item.prefix) {
        breadcrumbAction = "pop"
      }
    })

    if (breadcrumbAction == "push") {
      let itemValue = prefix == "" ? bucketName : prefix
      breadcrumbStack.push({type:"object", bucket:bucketName, prefix:prefix, value:itemValue})
    } else {
      while (true) {
        item = breadcrumbStack.pop()
        if (item.prefix == prefix) {
          breadcrumbStack.push(item)
          break;
        }
      }
    }
  }
  globalWrapper.loadBreadcrumb(breadcrumbStack)

  // Show loading animation
  $("#main_page").load("subviews/objects/objects.html", function() {
    $(".objects").html("")
    $("#loading").load('subviews/loading/loading.html', function() {
      tool.localize()
    })
  })

  // Remove all ipcRenderer listeners to avoid multiple calls
  ipcRenderer.removeAllListeners()

  ipcRenderer.on('error-alert', (event, errorMessage) => {
    $('input[type=checkbox]').prop('checked', false)
    let Toast = Swal.mixin({
      toast: true,
      position: 'top-right',
      showConfirmButton: false,
      timer: 5000
    });
    Toast.fire({
      icon: 'error',
      title: errorMessage
    })
    $(".overlay").remove()
  })

  ipcRenderer.send('fetch-bucket-objects-send', bucketName, prefix, keyword, style)

  ipcRenderer.once('fetch-bucket-objects-response', (event, ret, parentPrefix) => {

    console.log(`fetch-bucket-objects-response ret `, ret)

    let message

    if (style == 'icons') {
      message = `
      <ul class="icons-ul">
      `
      let folders, objects
      if (ret === Object(ret)) {

        bucketUrl = ret.Href + bucketName + '/';

        folders = ret.CommonPrefixes
        folders.forEach(folder => {
          console.log(`folder `, folder)
          let displayName = folder.Prefix
          if (folder.Prefix.indexOf(parentPrefix) == 0) {
            displayName = folder.Prefix.slice(parentPrefix.length)
          }
          message += `
          <li class="" bucket_name="${bucketName}" prefix="${folder.Prefix}">
            <div>
              <input type="checkbox" name="dir" />
              <i class="far fa-folder mr-2 objects-folder"></i>
              <span>${displayName}</span>
            </div>
          </li>
          `
        })

        objects = ret.Contents
        objects.forEach(object => {
          console.log(`object `, object)
          if (object.Key != parentPrefix) {
            let fileUrl = bucketUrl + object.Key
            let displayName = object.Key
            if (object.Key.indexOf(parentPrefix) == 0) {
              displayName = object.Key.slice(parentPrefix.length)
            }
            let displayType = "文件"
            if (displayName.indexOf('.') > 0) {
              displayType = displayName.split('.').pop().toLowerCase()
            }
            let imageTypes = ['jpg', 'jpeg', 'png', 'svg', 'ico', 'bmp', 'gif', 'heic']
            let icons = ""
            if (imageTypes.includes(displayType)) {
              icons = "icons"
            }

            message += `
            <li class="${icons}" bucket_name="${bucketName}" key_value="${object.Key}" object_name="${displayName}">
              <div>
                <input type="checkbox" name="object" />
                <i class="far fa-file mr-2"></i>
                <img class="ml-3" src="" style="display:none;"/>
                <span>${displayName}</span>
              </div>
            </li>
          `
          }
        })

      }
      message += `</ul>`

    } else {

      message = `
      <table class="table text-wrap">
        <thead>
          <tr>
            <th width="5%"></th>
            <th width="47%" data-i18n="objects.table.name"></th>
            <th width="10%" data-i18n="objects.table.type"></th>
            <th width="15%" data-i18n="objects.table.lastModified"></th>
            <th width="10%" data-i18n="objects.table.size"></th>
            <th width="13%" data-i18n="objects.table.storageClass"></th>
          </tr>
        </thead>
        <tbody id="objects_list">
    `
      let folders, objects
      if (ret === Object(ret)) {

        bucketUrl = ret.Href + bucketName + '/';

        folders = ret.CommonPrefixes
        folders.forEach(folder => {
          console.log(`folder `, folder)
          let displayName = folder.Prefix
          if (folder.Prefix.indexOf(parentPrefix) == 0) {
            displayName = folder.Prefix.slice(parentPrefix.length)
          }
          message += `
        <tr class="" bucket_name="${bucketName}" prefix="${folder.Prefix}">
            <td><input type="checkbox" name="dir" /></td>
            <td><li class="far fa-folder mr-2"></li><a class="objects-folder" href="#">${displayName}</a></td>
            <td data-i18n="objects.table.folder"></td>
            <td>-</td>
            <td>-</td>
            <td>-</td>
        </tr>
        `
        })

        objects = ret.Contents
        objects.forEach(object => {
          console.log(`object `, object)
          if (object.Key != parentPrefix) {
            let fileUrl = bucketUrl + object.Key
            let displayName = object.Key
            if (object.Key.indexOf(parentPrefix) == 0) {
              displayName = object.Key.slice(parentPrefix.length)
            }
            let displayType = i18n.t("objects.table.object")
            if (displayName.indexOf('.') > 0) {
              displayType = displayName.split('.').pop().toLowerCase()
            }
            let displaySize = tool.formatBytes(object.Size)
            let lastModified = tool.formatDate(object.LastModified)
            let classLabel = i18n.t("objects.storageClass." + object.StorageClass)
            message += `
          <tr bucket_name="${bucketName}" key_value="${object.Key}" object_name="${displayName}">
              <td><input type="checkbox" name="object" /></td>
              <td><li class="far fa-file mr-2"></li>${displayName}</td>
              <td>${displayType}</td>
              <td>${lastModified}</td>
              <td>${displaySize}</td>
              <td>${classLabel}</td>
          </tr>
          `
          }
        })

      }

      message += `
        </tbody>
      </table>
    `
    }


    // Show folders and objects
    $(".objects").html(message)

    // Load images if necessary
    $(".icons").each(function() {
      let bucketName = $(this).attr('bucket_name')
      let keyValue = $(this).attr('key_value')
      ipcRenderer.send('get-object-url-send', bucketName, keyValue)
      ipcRenderer.on(`get-object-${bucketName}-${keyValue}-url-response`, (event, url) => {
        $(this).find("img").attr("src", url)
        $(this).find("img").show()
        $(this).find("i").hide()
      })
    })

    // Bind click action for folders
    $(".objects-folder").each(function() {
      $(this).off("click").on("click", {bucketName: $(this).parent().parent().attr("bucket_name"), prefix: $(this).parent().parent().attr("prefix")}, listBucketObjects)
    })

    // drag to download file
    /*$(".s3-file").each(function() {
      $(this).off('dragstart').on('dragstart', function(event) {
        event.preventDefault()
        parent2 = $(event.target).parent().parent()
        ipcRenderer.send('on-drag-start', parent2.attr('bucket_name'), parent2.attr('key_value'))
      })
    })

    // drag file from desktop
    document.addEventListener('drop', (event) => {
      event.preventDefault()
      event.stopPropagation()

      for (const f of event.dataTransfer.files) {
        console.log('File Path of dragged files: ', f.path)
        ipcRenderer.send('on-drop-start', bucketName, prefix, f.path)
      }

      Toast.fire({
        icon: 'success',
        title: '开始上传，可通过上传管理查看进度'
      })
    })

    document.addEventListener('dragover', (event) => {
      event.preventDefault()
      event.stopPropagation()
    })

    document.addEventListener('dragenter', (event) => {
      console.log('File is in the Drop Space')
    })

    document.addEventListener('dragleave', (event) => {
      console.log('File has left the Drop Space')
    })*/

    // Bind switch style event
    $(".objects_style").off("click").on("click", function() {
      globalObjects.listBucketObjects({data: {bucketName: bucketName, prefix: prefix, style: $(this).val()}})
    })

    // Bind refresh event
    $("#refresh_objects").off("click").on("click", function() {
      globalObjects.listBucketObjects({data: {bucketName: bucketName, prefix: prefix}})
    })

    ipcRenderer.on('refresh-bucket-objects', (event, bucketName, prefix) => {
      console.log("response for refresh " + bucketName + " " + prefix)
      let param = {}
      param.data = {
        bucketName: bucketName,
        prefix: prefix
      }
      globalObjects.listBucketObjects(param)
    })


    // Bind delete objects event
    $("#delete_objects_btn").off("click").on("click", function() {

      let keys = []
      $("input[name='object']:checked").each(function() {
        parent2 = $(this).parent().parent()
        keys.push({Key: parent2.attr("key_value"), Type: 'object'})
      })
      $("input[name='dir']:checked").each(function() {
        parent2 = $(this).parent().parent()
        keys.push({Key: parent2.attr("prefix"), Type: 'folder'})
      })
      ipcRenderer.send('delete-bucket-objects-send', bucketName, keys)
      ipcRenderer.on('delete-bucket-objects-response', (event) => {
        $("input[name='object']:checked, input[name='dir']:checked").each(function() {
          parent2 = $(this).parent().parent()
          parent2.hide("slow", function() {
            parent2.remove()
            Toast.fire({
              icon: 'success',
              title: i18n.t("toast.deletedSuccessfully")
            })
          })
        })
      })
    })


    // Bind share event
    $("#share_submit").off("click").on("click", function() {

      if ($("input[name='dir']:checked").length > 0) {
        $('input[type=checkbox]').prop('checked', false)
        $("#share_objects_btn").click()
        Toast.fire({
          icon: 'warning',
          title: i18n.t("toast.canNotShareFolder")
        })
      }

      let objects = []
      $("input[name='object']:checked").each(function() {
        parent2 = $(this).parent().parent()
        objects.push({Key: parent2.attr("key_value")})
      })

      ipcRenderer.send('share-bucket-objects-send', bucketName, objects, $("input[name='expire_type']:checked").val(), $("#expire_value").val())

      $("#expire_value").val("")
    })

    ipcRenderer.on('share-bucket-objects-response', (event, filePath, url) => {
      $('input[type=checkbox]').prop('checked', false)
      $("#share_objects_btn").click()
      clipboard = electron.clipboard
      clipboard.writeText(url, 'selection')
      console.log("clipboard: " + clipboard.readText('selection'))

      let Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 10000
      });
      Toast.fire({
        icon: 'success',
        title: i18n.t("toast.copiedToClipboard")
      })
    })


    // Bind download event and listeners
    $("#download_objects_btn").off("click").on("click", function() {

      let objects = []
      let keys = []
      $("input[name='dir']:checked").each(function() {
        parent2 = $(this).parent().parent()
        objects.push({key: parent2.attr("prefix")})
        keys.push({Key: parent2.attr("prefix"), Type: 'folder'})
      })
      $("input[name='object']:checked").each(function() {
        parent2 = $(this).parent().parent()
        objects.push({Key: parent2.attr("key_value"), Name: parent2.attr("object_name")})
        keys.push({Key: parent2.attr("key_value"), Name: parent2.attr("object_name"), Type: 'object'})
      })
      ipcRenderer.send('download-bucket-objects-send', bucketName, prefix, keys)

    })

    ipcRenderer.on('download-bucket-objects-start-response', (event, fileName) => {
      $('input[type=checkbox]').prop('checked', false)
      Toast.fire({
        icon: 'success',
        title: '[' + fileName + '] ' + i18n.t("toast.yourDownloadHasStarted")
      })
    })

    ipcRenderer.on('download-bucket-objects-finish-response', (event, fileName) => {
      $('input[type=checkbox]').prop('checked', false)
      Toast.fire({
        icon: 'success',
        title: '[' + fileName + '] ' + i18n.t("toast.yourDownloadHasCompleted")
      })
    })

    // Bind make-object-public event and listeners
    $("#make_public_btn").off("click").on("click", function() {
      $(this).parent().parent().dropdown('toggle')
      let objects = []
      let keys = []
      $("input[name='dir']:checked").each(function() {
        parent2 = $(this).parent().parent()
        objects.push({key: parent2.attr("prefix")})
        keys.push({Key: parent2.attr("prefix"), Type: 'folder'})
      })
      $("input[name='object']:checked").each(function() {
        parent2 = $(this).parent().parent()
        objects.push({Key: parent2.attr("key_value"), Name: parent2.attr("object_name")})
        keys.push({Key: parent2.attr("key_value"), Name: parent2.attr("object_name"), Type: 'object'})
      })
      ipcRenderer.send('make-object-public-send', bucketName, prefix, keys)
    })

    ipcRenderer.on('make-object-public-response', (event, fileName) => {
      $('input[type=checkbox]').prop('checked', false)
      Toast.fire({
        icon: 'success',
        title: '[' + fileName + '] ' + i18n.t("toast.makePublicSuccessfully")
      })
    })

    // Bind add folder event
    $("#add_folder_submit").off("click").on("click", function() {
      ipcRenderer.send('create-bucket-folder-send', bucketName, prefix, $("#folder_name").val())
      $("#add_folder_btn").click()
    })

    // Bind upload event & listener
    $("#upload_objects_btn").off("click").on("click", function() {
      $(this).parent().parent().dropdown('toggle')
      ipcRenderer.send('upload-bucket-objects-send', bucketName, prefix, 'objects')
    })

    $("#upload_folders_btn").off("click").on("click", function() {
      $(this).parent().parent().dropdown('toggle')
      ipcRenderer.send('upload-bucket-objects-send', bucketName, prefix, 'folders')
    })

    ipcRenderer.on('upload-bucket-objects-start-response', (event, result) => {
      Toast.fire({
        icon: 'success',
        title: i18n.t("toast.yourUploadHasStarted")
      })
    })

    ipcRenderer.on('upload-bucket-objects-finish-response', (event, result) => {
      Toast.fire({
        icon: 'success',
        title: '[' + result.Key + '] ' + i18n.t("toast.yourUploadHasCompleted")
      })
    })


    // Bind search event
    $("#search").off("click").on("click", function() {
      let keyword = $("input[name=table_search]").val()
      globalObjects.listBucketObjects({data: {bucketName: bucketName, prefix: prefix, keyword: keyword}})
    })
    $("input[name=table_search]").on('keypress', function(e) {
      if (e.which === 13) {
        let keyword = $("input[name=table_search]").val()
        globalObjects.listBucketObjects({data: {bucketName: bucketName, prefix: prefix, keyword: keyword}})
      }
    })

    // Remove loading animation
    $(".overlay").remove()

    // localize
    tool.localize()

    $("input[name=table_search]").attr("placeholder", i18n.t("objects.table.search"))
  })

}

module.exports = {listBucketObjects}
