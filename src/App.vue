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
        color: '#fff',
        backgroundColor: '#222222',
        minHeight: '0',
        flex: '1 1 auto',
};

const siderStyle: CSSProperties = {
        textAlign: 'center',
        color: '#fff',
        backgroundColor: '#373737',
};

const footerStyle: CSSProperties = {
        color: '#fff',
        backgroundColor: '#2276ae',
        padding: '4px 20px',
};
</script>

