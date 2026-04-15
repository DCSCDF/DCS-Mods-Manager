<template>
        <div class="m-5">

                <div class="mb-5">
                        <h1 class="text-2xl text-gray-800 mb-2! font-medium">
                                Mod 管理
                        </h1>
                        <p  class="text-gray-500 mb-6">
                                这里是 DCSMod 管理的内容区域
                        </p>
                </div>


                        <div class="flex items-center justify-between mb-5">
                                <div class="flex gap-4">
                                        <a-radio-group>
                                                <a-radio-button value="large">全选</a-radio-button>
                                                <a-radio-button value="default">反选</a-radio-button>
                                                <a-radio-button value="small">
                                                        <CloseOutlined />
                                                </a-radio-button>
                                        </a-radio-group>

                                        <a-cascader  style="width: 100px"  placeholder="状态筛选" />

                                        <a-input-search
                                            placeholder="搜索"
                                            style="width: 200px"
                                        />
                                </div>
                                <div>
                                        <a-radio-group>
                                                <a-radio-button value="large">
                                                        <ExportOutlined />
                                                </a-radio-button>
                                                <a-radio-button value="default">
                                                        <UploadOutlined />
                                                </a-radio-button>
                                                <a-radio-button value="small">
                                                        <DeleteOutlined />
                                                </a-radio-button>
                                        </a-radio-group>
                                </div>
                        </div>
                <div class="flex flex-row ">
                        <div>
                                <a-card size="small" class="mr-4!" title="模组目录" style="width: 240px">

                                        <a-directory-tree
                                            v-model:expandedKeys="expandedKeys"
                                            v-model:selectedKeys="selectedKeys"
                                            multiple
                                            :tree-data="treeData"
                                        ></a-directory-tree>
                                </a-card>
                        </div>
                        <div class="w-full!">
                                <a-card size="small" style="height: 1600px">123</a-card>
                        </div>

                </div>


        </div>
</template>

<script setup lang="ts">
import {CloseOutlined, ExportOutlined, UploadOutlined, DeleteOutlined, SnippetsOutlined} from '@ant-design/icons-vue';
import type { TreeProps } from 'ant-design-vue';
import {h, ref} from 'vue';

const expandedKeys = ref<string[]>(['0-0', '0-1']);
const selectedKeys = ref<string[]>([]);
const treeData: TreeProps['treeData'] = [
        {
                title: '全部',
                key: '0',
            icon: () => h(SnippetsOutlined),
        },
        {
                title: 'parent 0',
                key: '0-0',
                children: [
                        {
                                title: 'leaf 0-0',
                                key: '0-0-0',
                                isLeaf: true,
                        },
                        {
                                title: 'leaf 0-1',
                                key: '0-0-1',
                                isLeaf: true,
                        },
                ],
        },
        {
                title: 'parent 1',
                key: '0-1',
                children: [
                        {
                                title: 'leaf 1-0',
                                key: '0-1-0',
                                isLeaf: true,
                        },
                        {
                                title: 'leaf 1-1',
                                key: '0-1-1',
                                isLeaf: true,
                        },
                ],
        },
];
</script>

<style scoped>

</style>