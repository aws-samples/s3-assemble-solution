function loadBreadcrumb(stack) {
  let message = ""
  let breadcrumb = []
  stack.forEach((item, idx, array) => {
    let displayValue = item.value
    if (item.type == "object" && item.prefix != "") {
      console.log(item.value.split("/"))
      displayValue = item.value.split("/").slice(-2)[0]
    }
    if (idx == array.length - 1) {
      message += `
      <li class="breadcrumb-item active" type="${item.type}" bucket="${item.bucket}" prefix="${item.prefix}">
        ${displayValue}
      </li>
      `
    } else {
      message += `
      <li class="breadcrumb-item" type="${item.type}" bucket="${item.bucket}" prefix="${item.prefix}">
        <a href="#">${displayValue}</a>
        <span class="breadcrumb-chevron-right">
            <i class="fas fa-chevron-right ml-1" aria-hidden="true"></i>
        </span>
      </li>
      `
    }
    $("#breadcrumb").html(message)
  })

  // Bind click event for breadcrumb
  if ($(".breadcrumb-item").length > 1) {
    $(".breadcrumb-item").each(function() {
      $(this).off("click").on("click", function(event) {
        let type = $(event.target).parent().attr("type")
        if (type == "home") {
          globalWrapper.loadWrapper()
        } else {
          let bucketName = $(event.target).parent().attr("bucket")
          let prefix = $(event.target).parent().attr("prefix")
          globalObjects.listBucketObjects({data:{bucketName: bucketName , prefix: prefix}})
        }
      })
    })
  }
}

function loadWrapper() {

  $("#body").load('subviews/wrapper/wrapper.html', function() {

    $(".main-header").off("dblclick").on("dblclick", function(event) {
      const window = electron.remote.getCurrentWindow();
      if (!window.isMaximized()) {
        window.maximize();
        return null;
      }
      window.unmaximize();
    })
    
    $("#upload_list_modal").on('show.bs.modal', function(e) {
        ipcRenderer.send('get-upload-list-send')
        ipcRenderer.on('get-upload-list-response', (event, data) => {
          let message = `
            <div class="">
              <!--<div class="card-header">
                <h3 class="card-title">Simple Full Width Table</h3>

                <div class="card-tools">
                  <ul class="pagination pagination-sm float-right">
                    <li class="page-item"><a class="page-link" href="#">«</a></li>
                    <li class="page-item"><a class="page-link" href="#">1</a></li>
                    <li class="page-item"><a class="page-link" href="#">2</a></li>
                    <li class="page-item"><a class="page-link" href="#">3</a></li>
                    <li class="page-item"><a class="page-link" href="#">»</a></li>
                  </ul>
                </div>
              </div>-->
              <!-- /.card-header -->
              <div class="card-body table-responsive p-0">
                <table class="table text-wrap">
                  <thead>
                    <tr>
                      <th width="45%" data-i18n="modal.fileName"></th>
                      <th width="35%" data-i18n="modal.uploadStatus"></th>
                      <th width="10%" data-i18n="modal.label"></th>
                      <th width="10%" data-i18n="modal.action"></th>
                    </tr>
                  </thead>
                  <tbody>
          `
          data.forEach((row) => {
            message += `
                    <tr>
                      <td>${row.file_name}</td>
                      <td>
                        <div class="progress progress-xs">
                          <div class="progress-bar bg-success" style="width: ${row.progress}%"></div>
                        </div>
                      </td>
                      <td><span class="badge bg-success">${row.progress}%</span></td>
                      <td>
                        <button class="close delete-record" file_id="${row.id}"><span class="mr-3">x</span></button>
                      </td>
                    </tr>
            `
          })
          message += `
                  </tbody>
                </table>
              </div>
              <!-- /.card-body -->
            </div>
          `
          $("#upload_list_body").html(message)

          tool.localize()

          $(".delete-record").each(function() {
            $(this).off("click").on("click", function(event) {
              let file_id = $(event.target).parent().attr("file_id")
              ipcRenderer.send('delete-upload-record-send', file_id)
              $(event.target).parents("tr").remove()
            })
          })
        })
    })

    ipcRenderer.send('check-credentials-exist-send')
    ipcRenderer.once('check-credentials-exist-response', (event, isExist) => {

      if (isExist) {
        globalBuckets.init()
        tool.localize()
      } else {
        $("#main_page").load('subviews/credential/credential.html', function() {
          $("#btn_nav_clear").hide()
          $("#btn_bar_upload").hide()
          $("#btn_bar_login").hide()
          $("#header_page").hide()
          globalCredential.login()
          $(".brand-link").off("click")
          tool.localize()
        })
      }
    })

  })

}

module.exports = {loadBreadcrumb, loadWrapper}
