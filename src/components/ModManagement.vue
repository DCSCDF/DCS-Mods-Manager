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
                                        <a-cascader  style="width: 100px"  placeholder="状态筛选" />

                                        <a-input-search
                                            placeholder="搜索"
                                            style="width: 200px"
                                        />

                                        <a-radio-group>
                                                <a-radio-button value="large">禁用</a-radio-button>
                                                <a-radio-button value="default">启用</a-radio-button>
                                                <a-radio-button value="default">删除</a-radio-button>
<!--                                                <a-radio-button value="small">-->
<!--                                                        <CloseOutlined />-->
<!--                                                </a-radio-button>-->
                                        </a-radio-group>


                                </div>
                                <div class="flex gap-4">
                                        <a-radio-group>
                                                <a-radio-button value="large">
                                                        <ExportOutlined />
                                                </a-radio-button>
                                                <a-radio-button value="default">
                                                        <UploadOutlined />
                                                </a-radio-button>
<!--                                                <a-radio-button value="small">-->
<!--                                                        <DeleteOutlined />-->
<!--                                                </a-radio-button>-->
                                        </a-radio-group>
                                        <a-button type="primary" @click="refreshMods" :loading="loading">
                                                <template #icon>
                                                        <ReloadOutlined />
                                                </template>
                                                刷新
                                        </a-button>
                                </div>
                        </div>
                <div class="flex flex-row ">
                        <div>
                                <a-card size="small" class="mr-3!" title="模组目录" style="width: 230px">
                                        <a-spin v-if="loading" />
                                        <a-directory-tree
                                            v-else
                                            v-model:expandedKeys="expandedKeys"
                                            v-model:selectedKeys="selectedKeys"
                                            :tree-data="treeData"
                                            @select="handleTreeSelect"
                                        ></a-directory-tree>
                                </a-card>
                        </div>
                        <div class="w-full!">
                                <a-card size="small"  class="mb-3!">
                                        <div class="flex items-center justify-between">
                                                <div class="flex items-center">
                                                        <h1 class="text-gray-500">共 {{ modCount }} 个模组</h1>
                                                </div>
<!--                                                <div>-->
<!--                                                        <a-pagination v-model:current="current1" size="small" show-quick-jumper :total="50" @change="onChange" />-->
<!--                                                </div>-->
                                        </div>
                                </a-card>

                                <a-card>
                                        <a-table size="small" :columns="columns" :data-source="data" :row-selection="rowSelection">
                                                <template #bodyCell="{ column, record }">
                                                        <template v-if="column.key === 'isUse'">
                                                                <a-tag :bordered="false" :color="record.isUse ? 'green' : 'red'">
                                                                        {{ record.isUse ? '启用' : '禁用' }}
                                                                </a-tag>
                                                        </template>
                                                </template>
                                        </a-table>
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
import {ExportOutlined, UploadOutlined,  ReloadOutlined} from '@ant-design/icons-vue';

import { ref, onMounted, computed} from 'vue';
import { Modal, message } from 'ant-design-vue';

const emit = defineEmits(['go-to-settings']);
const isValidPath = ref(true);
const loading = ref(false);

// 模组目录树数据
interface ModTreeNode {
  title: string
  key: string
  path: string
  isMod: boolean
  children?: ModTreeNode[]
  scopedSlots?: { icon: string }
}

const treeData = ref<ModTreeNode[]>([]);
const expandedKeys = ref<string[]>([]);
const selectedKeys = ref<string[]>([]);

// 模组数量
const modCount = computed(() => {
  let count = 0;
  const countMods = (nodes: ModTreeNode[]) => {
    for (const node of nodes) {
      if (node.isMod) {
        count++;
      }
      if (node.children) {
        countMods(node.children);
      }
    }
  };
  countMods(treeData.value);
  return count;
});

// const onChange = (pageNumber: number) => {
//         console.log('Page: ', pageNumber);
// };

// 扫描 Mods 目录
const scanModsDirectory = async () => {
  loading.value = true;
  try {
    if (!window.windowApi?.getSettings) {
      console.error('windowApi.getSettings 不可用');
      return;
    }

    const settings = await window.windowApi.getSettings();
    if (!settings.dcsPath) {
      isValidPath.value = false;
      return;
    }

    if (!window.windowApi?.scanModsDirectory) {
      console.error('windowApi.scanModsDirectory 不可用');
      return;
    }

    const result = await window.windowApi.scanModsDirectory(settings.dcsPath);
    if (result.success && result.tree) {
      treeData.value = transformToAntTree(result.tree);
      expandedKeys.value = treeData.value.map(node => node.key);
      message.success('模组目录加载成功');
    } else {
      message.error(result.error || '扫描失败');
    }
  } catch (error) {
    console.error('扫描 Mods 目录失败:', error);
    message.error('扫描失败: ' + (error as Error).message);
  } finally {
    loading.value = false;
  }
};

// 截断过长的名称
const truncateText = (text: string, maxLength: number = 15): string => {
  if (text.length > maxLength) {
    return text.slice(0, maxLength) + '...';
  }
  return text;
};

// 转换数据为 Ant Design Tree 格式
const transformToAntTree = (nodes: ModTreeNode[]): ModTreeNode[] => {
  return nodes.map(node => ({
    title: truncateText(node.title),
    key: node.key,
    path: node.path,
    isMod: node.isMod,
    children: node.children && node.children.length > 0 ? transformToAntTree(node.children) : undefined,
    scopedSlots: {
      icon: node.isMod ? 'FileTextOutlined' : 'FolderOutlined'
    }
  }));
};

// 处理树节点选择
const handleTreeSelect = (keys: string[]) => {
  console.log('选中的节点:', keys);
  selectedKeys.value = keys;
};

// 刷新模组列表
const refreshMods = () => {
  scanModsDirectory();
};

// 检查路径是否有效
const checkPath = async () => {
        try {
                if (window.windowApi?.getSettings) {
                        const settings = await window.windowApi.getSettings();
                        if (!settings.dcsPath) {
                                isValidPath.value = false;
                                Modal.error({
                                        title: '未配置路径',
                                        content: '请先在设置页面配置 DCS 安装路径',
                                        okText: '前往设置',
                                        maskClosable: false,
                                        closable: false,
                                        onOk: () => {
                                                emit('go-to-settings');
                                        }
                                });
                                return false;
                        }
                }
        } catch (error) {
                console.error('检查路径失败:', error);
        }
        return true;
};

// 暴露方法给父组件
defineExpose({
        checkPath,
        refreshMods
});

// 组件挂载时检查路径并扫描
onMounted(async () => {
        const pathValid = await checkPath();
        if (pathValid) {
                await scanModsDirectory();
        }
});

const rowSelection = ref({
        checkStrictly: false,
});

const columns = [
        {
                title: '模组名称',
                dataIndex: 'displayName',
                key: 'displayName',
                width: '40%',
                ellipsis: true,
        },
        {
                title: '状态',
                dataIndex: 'isUse',
                width: '70px',
                key: 'isUse',
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
                width: '60%',
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
        isUse: boolean;
        children?: DataItem[];
}

const data: DataItem[] = [];
</script>

<style scoped>
/deep/ .ant-tree-title {
  display: inline-block;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}
</style>