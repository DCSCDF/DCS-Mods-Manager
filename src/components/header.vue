<template>
        <a-layout-header :style="headerStyle">Header</a-layout-header>
</template>
<script setup lang="ts">
import type { CSSProperties } from 'vue';
const headerStyle: CSSProperties = {
        color: '#fff',
        height: 64,
        paddingInline: 50,
        lineHeight: '64px',
        backgroundColor: 'rgb(43,43,43)',
};

</script>
<style scoped>

</style>