function init() {

  console.log(arguments.callee.name + " is called")

  breadcrumbStack = [
    {
      type: "home",
      value: "Amazon S3"
    }
  ]

  // Load content header consisting of breadcrumbs and action buttons
  $("#header_page").load("subviews/header/s3_header.html", function() {
    $("#bucket_buttons").show()
    $("#object_buttons").hide()
    globalWrapper.loadBreadcrumb(breadcrumbStack)
    $("#header_page").show()
  })

  // Load subview buckets
  $("#main_page").load("subviews/buckets/buckets.html", function() {
    console.log("listBuckets is called from init")
    globalBuckets.listBuckets({data: {}})
    tool.localize()
  })

  // Bind events for main header buttons and set status
  $("#btn_nav_clear").show()
  $("#btn_nav_clear").off("click").on("click", function(event) {
    ipcRenderer.send('clear-cache-send')
    ipcRenderer.on('clear-cache-response', (event) => {
        globalCredential.logout()
    })
  })

  $("#btn_bar_upload").show()

  $("#btn_bar_login").show()
  $("#btn_bar_login button").html(i18n.t("wrapper.logout"))
  $("#btn_bar_login").off("click").on("click", globalCredential.logout)

  $(".brand-link").off("click").on("click", globalBuckets.init)
}

function listBuckets(event) {

  console.log(arguments.callee.name + " is called")

  ipcRenderer.removeAllListeners()

  ipcRenderer.on('error-alert', (event, errorMessage) => {
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

  let searchValue = event.data.searchValue

  $("#buckets_list").html("")
  $("#loading").load('subviews/loading/loading.html', function() {
    tool.localize()
  })

  ipcRenderer.send('fetch-buckets-send')
  ipcRenderer.once('fetch-buckets-response', (event, arg) => {
    let message = ""
    if (arg === Object(arg)) {
      console.log(arg)
      let buckets = arg.Buckets
      buckets.forEach(bucket => {
        if (!searchValue || bucket.Name.includes(searchValue)) {
          let creationDate = tool.formatDate(bucket.CreationDate)
          message += `
          <tr class="tr-buckets-rows" bucket_name="${bucket.Name}" prefix="">
              <!--<td><input type="checkbox" /></td>-->
              <td>
                  <span style="margin-right:7px; color: Tomato">
                      <li class="fab fa-css3-alt"></li>
                  </span>
                  <a href="#">${bucket.Name}</a>
              </td>
              <td class="region"></td>
              <td class="public-access-block"></td>
              <td>${creationDate}</td>
          </tr>
          `
        }
      })
    } else {
        message = `fetch-buckets-response: ${arg}`
    }

    $("#buckets_list").html(message)
    $(".overlay").remove()

    // Bind event for search
    $("#search").off("click").on("click", function() {
      let searchValue = $("input[name=table_search]").val()
      globalBuckets.listBuckets({data: {searchValue: searchValue}})
    })

    $("input[name=table_search]").on('keypress', function(e) {
      if (e.which === 13) {
        let searchValue = $("input[name=table_search]").val()
        globalBuckets.listBuckets({data: {searchValue: searchValue}})
      }
    })

    // Bind click event for refresh
    $("#refresh_buckets").off("click").on("click", function() {
      $("input[name=table_search]").val("")
      globalBuckets.listBuckets({data: {}})
    })

    // Bind click event for viewing bucket
    $(".tr-buckets-rows").each(function() {
        $(this).off("click").on("click", {bucketName: $(this).attr("bucket_name"), prefix: ""}, globalObjects.listBucketObjects)
    })

    // Fetch bucket region & public access block info
    $(".tr-buckets-rows").each(function() {
      ipcRenderer.send('get-bucket-region-send', $(this).attr("bucket_name"))
      ipcRenderer.once('get-bucket-region-' + $(this).attr("bucket_name") + '-response', (event, data) => {
        $(this).find(".region").html(i18n.t("buckets.region." + data.LocationConstraint) + " " + data.LocationConstraint)
      })

      ipcRenderer.send('get-bucket-public-access-block-send', $(this).attr("bucket_name"))
      ipcRenderer.once('get-bucket-public-access-block-' + $(this).attr("bucket_name") + '-response', (event, data) => {
        $(this).find(".public-access-block").html(data)
      })
    })
  })
}

module.exports = {init, listBuckets}
