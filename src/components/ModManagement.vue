<template>
        <div class="m-5">

                <div class="mb-6">
                        <h1 class="text-2xl text-gray-800 mb-2! font-medium">
                                Mod 管理
                        </h1>
                        <p  class="text-gray-500 mb-6">
                                这里是 DCSMod 管理的内容区域
                        </p>
                </div>


                        <div class="flex items-center justify-between mb-3">
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
                                <div class="flex gap-4">
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
                                        <a-button type="primary">刷新</a-button>
                                </div>
                        </div>
                <div class="flex flex-row ">
                        <div>
                                <a-card size="small" class="mr-3!" title="模组目录" style="width: 220px">

                                        <a-directory-tree
                                            v-model:expandedKeys="expandedKeys"
                                            v-model:selectedKeys="selectedKeys"
                                            multiple
                                            :tree-data="treeData"
                                        ></a-directory-tree>
                                </a-card>
                        </div>
                        <div class="w-full!">
                                <a-card size="small"  class="mb-3!">
                                        <div class="flex items-center justify-between">
                                                <div class="flex items-center">
                                                        <h1 class="text-gray-500">共 10 个模组</h1>
                                                </div>
                                                <div>
                                                        <a-pagination v-model:current="current1" size="small" show-quick-jumper :total="50" @change="onChange" />
                                                </div>
                                        </div>
                                </a-card>

                                <a-card>
                                        <a-table :columns="columns" :data-source="data" :row-selection="rowSelection" />
                                </a-card>


<!--                                空内容-->
<!--                                <a-card>-->
<!--                                        <a-empty />-->
<!--                                </a-card>-->
                        </div>

                </div>


        </div>
</template>

<script setup lang="ts">
import {CloseOutlined, ExportOutlined, UploadOutlined, DeleteOutlined, SnippetsOutlined} from '@ant-design/icons-vue';
import type { TreeProps } from 'ant-design-vue';
import {h, ref} from 'vue';
const current1 = ref<number>(1);
const onChange = (pageNumber: number) => {
        console.log('Page: ', pageNumber);
};
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

const columns = [
        {
                title: '模组名称',
                dataIndex: 'displayName',
                key: 'displayName',
                ellipsis: true,
        },
        {
                title: '版本',
                dataIndex: 'version',
                key: 'version',
                width: '100px',
                ellipsis: true,
        },
        {
                title: '作者',
                dataIndex: 'developerName',
                width: '20%',
                key: 'developerName',
                ellipsis: true,
        },
        {
                title: '简介信息',
                dataIndex: 'info',
                width: '40%',
                key: 'info',
                ellipsis: true,
        },
];

interface DataItem {
        key: number;
        displayName: string;
        version: string;
        developerName: string;
        info: string;
        children?: DataItem[];
}

const data: DataItem[] = [
        {
                key: 1,
                displayName: 'John Brown sr.',
                version: "2.0.2812",
                developerName: 'New York No. 1 Lake Park',
                info: "",
                children: [
                        {
                                key: 11,
                                displayName: 'John Brown',
                                version: "6.1.0",
                                developerName: 'New York No. 2 Lake Park',
                                info: ""
                        },
                        {
                                key: 12,
                                displayName: 'John Brown jr.',
                                version: "6.1.0",
                                developerName: 'New York No. 3 Lake Park',
                                info: "",
                                children: [
                                        {
                                                key: 121,
                                                displayName: 'Jimmy Brown',
                                                version: "6.1.0",
                                                developerName: 'New York No. 3 Lake Park',
                                                info: ""
                                        },
                                ],
                        },
                        {
                                key: 13,
                                displayName: 'Jim Green sr.',
                                version: "6.1.0",
                                developerName: 'London No. 1 Lake Park',
                                info: "The Sukhoi Su-35 (NATO reporting name: Flanker-E) is the designation for two separate, heavily-upgraded derivatives of the Su-27 air-defence fighter. They are single-seat, twin-engine, highly-maneuverable aircraft, designed by the Sukhoi Design Bureau and built by the Komsomolsk-on-Amur Aircraft Production Association.",
                                children: [
                                        {
                                                key: 131,
                                                displayName: 'Jim Green',
                                                version: "6.1.0",
                                                developerName: 'London No. 2 Lake Park',
                                                info: "",
                                                children: [
                                                        {
                                                                key: 1311,
                                                                displayName: 'Jim Green jr.',
                                                                version: "6.1.0",
                                                                developerName: 'London No. 3 Lake Park',
                                                                info: ""
                                                        },
                                                        {
                                                                key: 1312,
                                                                displayName: 'Jimmy Green sr.',
                                                                version: "6.1.0",
                                                                developerName: 'London No. 4 Lake Park',
                                                                info: ""
                                                        },
                                                ],
                                        },
                                ],
                        },
                ],
        },
        {
                key: 2,
                displayName: 'Joe Black',
                version: "6.1.0",
                developerName: 'Sidney No. 1 Lake Park',
                info: "The Sukhoi Su-35 (NATO reporting name: Flanker-E) is the designation for two separate, heavily-upgraded derivatives of the Su-27 air-defence fighter. They are single-seat, twin-engine, highly-maneuverable aircraft, designed by the Sukhoi Design Bureau and built by the Komsomolsk-on-Amur Aircraft Production Association."
        },
];

const rowSelection = ref({
        checkStrictly: false,
});
</script>

<style scoped>

</style>