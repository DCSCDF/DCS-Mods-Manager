<template>
        <a-layout-sider v-model:collapsed="collapsed" :trigger="null" collapsible :style="siderStyle">


                <a-menu
                    style="background-color: #f8f8f8 !important;"
                    v-model:openKeys="openKeys"
                    v-model:selectedKeys="selectedKeys"
                    mode="inline"
                    :items="items"
                    @click="handleClick"
                    class="sider-menu p-2!"
                ></a-menu>


        </a-layout-sider>
</template>
<script setup lang="ts">
import type { CSSProperties } from 'vue';
const siderStyle: CSSProperties = {
        textAlign: 'center',
        color: '#3e3e3e',

        overflow: 'auto',
        position: 'relative',
};

import { reactive, ref, h } from 'vue';
import { MailOutlined, AppstoreOutlined, SettingOutlined, MenuUnfoldOutlined, MenuFoldOutlined } from '@ant-design/icons-vue';
import type { ItemType } from 'ant-design-vue';
import type { VNodeChild } from 'vue';

function getItem(
        label: VueElement | string,
        key: string,
        icon?: (() => VNodeChild) | undefined,
        children?: ItemType[],
        type?: 'group',
): ItemType {
        return {
                key,
                icon,
                children,
                label,
                type,
        } as ItemType;
}

const collapsed = ref(true);
const openKeys = ref<string[]>([]);
const selectedKeys = ref<string[]>([]);

const items: ItemType[] = reactive([
        getItem('Mod管理', 'sub1', () => h(MailOutlined)),
        getItem('设置', 'sub2', () => h(SettingOutlined)),
]);


</script>
<style scoped>
.sider-menu {
        height: 100%;
        border-right: none;
}
</style>