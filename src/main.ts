import { createApp } from 'vue'
import App from './App.vue'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import './style.css' // 引入 Tailwind CSS

const app = createApp(App)

// 全局注册 antd 组件
app.use(Antd)

// 全局注册 ant-design-vue 图标
import * as Icons from '@ant-design/icons-vue'
for (const [key, component] of Object.entries(Icons)) {
  app.component(key, component)
}

app.mount('#app')
    .$nextTick(() => {
        postMessage({payload: 'removeLoading'}, '*')
    }).then()
