<template>
        <a-layout-header :style="headerStyle">
                <a-tooltip title="search">
                        <a-button type="primary" shape="circle" :icon="h(SearchOutlined)" />
                </a-tooltip>
                Header

        </a-layout-header>
</template>
<script setup lang="ts">
import type { CSSProperties } from 'vue';
import { h } from 'vue';
import { SearchOutlined } from '@ant-design/icons-vue';
const headerStyle: CSSProperties = {
        color: '#fff',
        height: '50px',
        paddingInline:  '30px',
        lineHeight: '50px',
        backgroundColor: 'rgb(43,43,43)',
};

</script>
<style scoped>

</style>