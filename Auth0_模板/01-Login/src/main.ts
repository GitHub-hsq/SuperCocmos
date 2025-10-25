import { library } from '@fortawesome/fontawesome-svg-core'
import { faLink, faPowerOff, faUser } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import hljsVuePlugin from '@highlightjs/vue-plugin'
import hljs from 'highlight.js/lib/core'
import json from 'highlight.js/lib/languages/json'
import { createApp } from 'vue'
import App from './App.vue'
import auth0 from './auth'
import { createRouter } from './router'
import 'highlight.js/styles/github.css'

hljs.registerLanguage('json', json)

const app = createApp(App)

library.add(faLink, faUser, faPowerOff)

app
  .use(hljsVuePlugin)
  .use(createRouter(app))
  .use(auth0)
  .component('font-awesome-icon', FontAwesomeIcon)
  .mount('#app')
