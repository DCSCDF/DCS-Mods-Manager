<template>
        <a-layout :style="{ height: '100vh', overflow: 'hidden' }">
                <Header/>
                <a-layout :style="{ overflow: 'hidden' }">
                        <sider v-model="currentTab" @change="handleTabChange"/>
                        <a-layout-content :style="contentStyle">
                                <ModManagement v-if="currentTab === 'sub1'"/>
                                <Settings v-else-if="currentTab === 'sub2'"/>
                        </a-layout-content>
                </a-layout>
                <a-layout-footer :style="footerStyle">v0.1</a-layout-footer>
        </a-layout>
</template>

<script lang="ts" setup>
import type { CSSProperties } from 'vue';
import { ref } from 'vue';
import Sider from "./components/Sider.vue"
import Header from "./components/header.vue"
import ModManagement from "./components/ModManagement.vue"
import Settings from "./components/Settings.vue"


const contentStyle: CSSProperties = {

        color: '#3e3e3e',
        backgroundColor: '#f8f8f8',
        minHeight: '0',
        flex: '1 1 auto',
        overflow: 'auto',
};

const footerStyle: CSSProperties = {
        color: '#fff',
        backgroundColor: '#4998cc',
        padding: '4px 20px',
};

// 当前选中的菜单项，默认为 sub1
const currentTab = ref('sub1');

const handleTabChange = (key: string) => {
        currentTab.value = key;
};
</script>

<style>
h1,
h2,
h3,
h4,
h5,
h6 {
        margin-bottom: 0.0em !important;
}

/* 修复Tailwind CSS导致的图片图标居中问题 */
img, svg, video, canvas, audio, iframe, embed, object {
        vertical-align: baseline !important;
}

/* 全局滚动条样式 */
::-webkit-scrollbar {
        width: 6px;
        height: 6px;
}

::-webkit-scrollbar-track {
        background: transparent;
}

::-webkit-scrollbar-thumb {
        background: rgba(155, 155, 155, 0.5);
        border-radius: 6px;
}

::-webkit-scrollbar-thumb:hover {
        background: rgba(155, 155, 155, 0.7);
}

/* 表格内部滚动优化 */
.table-wrapper ::-webkit-scrollbar {
        height: 8px;
}

.table-wrapper ::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 4px;
}

.table-wrapper ::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 4px;
}

.table-wrapper ::-webkit-scrollbar-thumb:hover {
        background: #a8a8a8;
}

</style>

