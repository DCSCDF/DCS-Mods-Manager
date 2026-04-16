<template>
        <a-layout-sider v-model:collapsed="collapsed" :trigger="null" collapsible :style="siderStyle">


                <a-menu
                    style="background-color: #f8f8f8 !important;"
                    v-model:openKeys="openKeys"
                    :selectedKeys="[modelValue]"
                    mode="inline"
                    :items="items"
                    @click="handleClick"
                    class="sider-menu p-2!"
                ></a-menu>


        </a-layout-sider>
</template>
<script setup lang="ts">
import type {CSSProperties, VueElement} from 'vue';
const siderStyle: CSSProperties = {
        textAlign: 'center',
        color: '#3e3e3e',
        overflowY: 'auto',
        overflowX: 'hidden',
        height: 'calc(100vh - 84px)',
        position: 'sticky',
        top: 0,
};

import { reactive, ref, h } from 'vue';
import { SettingOutlined, AppstoreOutlined } from '@ant-design/icons-vue';
import type { ItemType } from 'ant-design-vue';
import type { VNodeChild } from 'vue';

defineProps<{
        modelValue: string;
}>();

const emit = defineEmits<{
        (e: 'update:modelValue', value: string): void;
        (e: 'change', value: string): void;
}>();

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

const items: ItemType[] = reactive([
        getItem('Mod管理', 'sub1', () => h(AppstoreOutlined)),
        getItem('设置', 'sub2', () => h(SettingOutlined)),
]);

const handleClick = (e: { key: string }) => {
        emit('update:modelValue', e.key);
        emit('change', e.key);
};


</script>
<style scoped>
.sider-menu {
        height: 100%;
        border-right: none;
}
</style>