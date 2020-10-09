/* global Widget, Convo, FileUploader, NNM, WIDGETS */
/*
  -----------
     info
  -----------

  Temporary Widget for uploading && managing assets for a-frame tutorial

  -----------
     usage
  -----------

  // it's important that the file-name matches the class-name because
  // this widget is instantiated by the WindowManager as...
  WIDGETS['Example Widget'] = new UploadAssets()

  // this class inherits all the properties/methods of the base Widget class
  // refer to www/js/Widget.js to see what those are
  // or take a look at the wiki...
  // https://github.com/netizenorg/netnet.studio/wiki/Creating-Widgets
*/
class UploadAssets extends Widget {
  constructor (opts) {
    super(opts)
    this.key = 'assets-widget'
    this.keywords = ['upload', 'files', 'jpg', 'jpeg', 'images', '3d', 'obj', 'gltf']
    this.title = 'Upload Assets'
    this.shaDict = {}
    this._setupFileUploader()
    this._createContent()
    this._initList()
    this.onchange = null

    this.convos = null
    window.utils.loadConvoData('upload-assets', () => {
      // NOTE: need to rerun this everytime a convo which relies on
      // localStorage data is going to launch (to ensure latest data)
      this.convos = window.convos['upload-assets'](this)
    })
  }

  get assets () {
    const files = []
    let l = this.$('#assets-drop > div')
    if (!l) return files
    l = (l instanceof window.HTMLElement) ? [l] : l
    for (let i = 0; i < l.length; i++) {
      files.push(l[i].textContent.substr(2))
    }
    return files
  }

  set assets (v) {
    console.warn('UploadAssets: assets property is read only')
  }

  deleteFile (name) {
    this._delete = name
    this.convos = window.convos['upload-assets'](this)
    window.convo = new Convo(this.convos['confirm-delete'])
  }

  _postDeletion () {
    this.sec.innerHTML = `
      <span id="assets-deleting">
      ...deleting ${this._delete}
      </span>`
    const data = {
      owner: window.localStorage.getItem('owner'),
      repo: window.localStorage.getItem('opened-project'),
      name: this._delete,
      sha: this.shaDict[this._delete]
    }
    window.utils.post('./api/github/delete-file', data, (res) => {
      if (res.success) delete this.shaDict[this._delete]
      this._delete = null
      this._initList()
    })
  }

  uploadFile (file) {
    this._upload = file.name
    if (this.shaDict[file.name]) {
      this.convos = window.convos['upload-assets'](this)
      window.convo = new Convo(this.convos['duplicate-file'])
    } else {
      this.sec.innerHTML = `
        <span id="assets-deleting">
        ...uploading ${file.name}
        </span>`
      const data = {
        owner: window.localStorage.getItem('owner'),
        repo: window.localStorage.getItem('opened-project'),
        name: file.name,
        code: file.data.split('base64,')[1]
      }
      window.utils.post('./api/github/upload-file', data, (res) => {
        this._initList()
      })
    }
  }

  updateView (arr) {
    arr = arr.filter((file) => {
      const split = file.name.split('.')
      const type = split[split.length - 1]
      return (type !== 'md' && type !== 'html')
    })
    if (arr.length === 0) {
      this.sec.innerHTML = 'no assets have been uploaded yet.'
    } else {
      this.sec.innerHTML = ''
      arr.forEach(file => {
        this.shaDict[file.name] = file.sha
        const p = document.createElement('div')
        p.innerHTML = `<span>✖</span> ${file.name}`
        const s = p.querySelector('span')
        s.style.cursor = 'pointer'
        s.addEventListener('click', () => this.deleteFile(file.name))
        this.sec.appendChild(p)
      })
    }
    const upload = document.createElement('button')
    upload.textContent = 'Upload'
    upload.style.margin = '22px'
    upload.addEventListener('click', () => this.fu.input.click())
    this.sec.appendChild(upload)
    // ...
    if (typeof this.onchange === 'function') this.onchange(this.assets)
  }

  // •.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*•.¸¸¸.•*

  _createContent () {
    this.sec = document.createElement('section')
    this.sec.id = 'assets-drop'
    this.sec.style.display = 'flex'
    this.sec.style.flexDirection = 'column'
    this.sec.style.maxHeight = '400px'
    this.sec.style.overflowY = 'scroll'
    this.sec.textContent = '...loading assets...'
    this.innerHTML = this.sec
  }

  _initList () {
    const owner = window.localStorage.getItem('owner')
    const repo = window.localStorage.getItem('opened-project')
    if (repo) this.listed = true
    else this.listed = false

    if (!owner || !repo) {
      this.sec.innerHTML = '<div>save your project before uploading assets</div><div><span id="upload-assets-help" class="link">need help?</span></div>'
      this.$('#upload-assets-help').addEventListener('click', () => {
        window.convo = new Convo(this.convos['upload-help'])
      })
    } else {
      const data = {
        owner: window.localStorage.getItem('owner'),
        repo: window.localStorage.getItem('opened-project')
      }
      window.utils.post('./api/github/get-files', data, (res) => {
        this.updateView(res.data)
        this._addAssetsToSearch(res.data)
      })
    }
  }

  _addAssetsToSearch (data) {
    // NOTE: this is temp, should be updated when we make the official
    // longterm file manager widget
    const arr = data
      .filter(a => a.name !== 'index.html' && a.name !== 'README.md')
      .filter(a => !NNM.search.dict.map(o => o.word).includes(a.name))
      .map(a => {
        return {
          type: 'widgets.Upload Assets',
          word: a.name,
          subs: a.name.split('.'),
          alts: [],
          clck: () => { WIDGETS[this.key].open() }
        }
      })
    NNM.search.addToDict(arr)
  }

  _setupFileUploader () {
    // setup FileUploader
    this.fu = new FileUploader({
      maxSize: 5000,
      ready: (file) => this.uploadFile(file),
      error: (err) => {
        console.error('UploadAssets:', err)
        if (err.includes('file larger than max size')) {
          window.convo = new Convo(this.convos['file-too-big'])
        }
      }
    })
  }
}

window.UploadAssets = UploadAssets
