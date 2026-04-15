<template>
        <a-layout :style="{ height: '100vh' }">
                <Header/>
                <a-layout>
                        <a-layout-sider :style="siderStyle">Sider</a-layout-sider>
                        <a-layout-content :style="contentStyle">Content</a-layout-content>
                </a-layout>
                <a-layout-footer :style="footerStyle">v0.1</a-layout-footer>
        </a-layout>
</template>

<script lang="ts" setup>
import type { CSSProperties } from 'vue';
import Header from "./components/header.vue"
const contentStyle: CSSProperties = {
        textAlign: 'center',
        color: '#c3c3c3',
        backgroundColor: '#222222',
        minHeight: '0',
        flex: '1 1 auto',
};

const siderStyle: CSSProperties = {
        textAlign: 'center',
        color: '#c3c3c3',
        backgroundColor: '#373737',
};

const footerStyle: CSSProperties = {
        color: '#fff',
        backgroundColor: '#2276ae',
        padding: '4px 20px',
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

