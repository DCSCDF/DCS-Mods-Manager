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
                                            v-model:value="searchText"
                                            placeholder="搜索模组名称、作者、简介"
                                            style="width: 250px"
                                            @search="handleSearch"
                                        />

                                        <a-radio-group>
                                                <a-radio-button value="large" @click="handleDisableMods" :disabled="selectedMods.length === 0" :loading="disabling">禁用</a-radio-button>
                                                <a-radio-button value="default" @click="handleEnableMods" :disabled="selectedDisabledMods.length === 0" :loading="enabling">启用</a-radio-button>
                                                <a-radio-button value="default" :disabled="true">删除</a-radio-button>
<!--                                                <a-radio-button value="small">-->
<!--                                                        <CloseOutlined />-->
<!--                                                </a-radio-button>-->
                                        </a-radio-group>


                                </div>
                                <div class="flex gap-4">
                                        <a-radio-group>
                                                <a-radio-button :disabled="true" value="large">
                                                        <ExportOutlined />
                                                </a-radio-button>
                                                <a-radio-button :disabled="true" value="default">
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
                                <a-card size="small" class="mr-3!" title="模组目录" style="width: 280px">
                                        <a-spin v-if="loading" />
                                        <a-directory-tree
                                            v-else
                                            v-model:expandedKeys="expandedKeys"
                                            v-model:selectedKeys="selectedKeys"
                                            :tree-data="treeData"
                                            @select="handleTreeSelect"
                                        >
                                            <template #title="{ dataRef }">
                                                <span>
                                                    {{ dataRef.title }}
<!--                                                    <span v-if="dataRef.isDisabled" class="text-xs text-gray-400 ml-1">(已禁用)</span>-->
                                                </span>
                                            </template>
                                        </a-directory-tree>
                                </a-card>
                        </div>
                        <div class="w-full!">
                                <a-card size="small"  class="mb-3!">
                                        <div class="flex items-center justify-between">
                                                <div class="flex items-center">
                                                        <h1 class="text-gray-500">共 {{ modCount }} 个模组</h1>
                                                </div>
                                        </div>
                                </a-card>

                                <a-card size="small">
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

// 跨平台路径拼接
// 从 disable_mods 路径转换为原始 Mods 路径
const disablePathToOriginalPath = (disablePath: string, dcsPath: string): string => {
  // 统一使用反斜杠处理 Windows 路径
  const normalizedDisablePath = disablePath.replace(/\//g, '\\');
  const normalizedDcsPath = dcsPath.replace(/\//g, '\\');
  // disable_mods 在 DCS 根目录下
  const disableModsPath = normalizedDcsPath + '\\disable_mods';
  if (normalizedDisablePath.startsWith(disableModsPath)) {
    const relativePath = normalizedDisablePath.substring(disableModsPath.length);
    return normalizedDcsPath + '\\Mods' + relativePath;
  }
  return disablePath;
};

const emit = defineEmits(['go-to-settings']);
const isValidPath = ref(true);
const loading = ref(false);
const disabling = ref(false);
const enabling = ref(false);
const searchText = ref('');
const searchMode = ref(false);
const selectedMods = ref<DataItem[]>([]);
const selectedDisabledMods = ref<DataItem[]>([]);  // 选中的已禁用 mods

// 模组目录树数据
interface ModTreeNode {
  title: string
  key: string
  path: string
  isMod: boolean
  children?: ModTreeNode[]
  scopedSlots?: { icon: string }
  originTitle?: string  // 保存原始名称用于表格显示
  displayName?: string  // 从 Entry.lua 解析
  version?: string
  info?: string
  developerName?: string
  entryLuaPath?: string  // Entry.lua 文件路径
  isDisabled?: boolean  // 是否是禁用的节点
}

// 原始树数据（未截断）
const rawTreeData = ref<ModTreeNode[]>([]);
const rawDisabledTreeData = ref<ModTreeNode[]>([]);  // 禁用的 mods 树
const treeData = ref<ModTreeNode[]>([]);
const expandedKeys = ref<string[]>([]);
const selectedKeys = ref<string[]>([]);

// 表格数据
interface DataItem {
  key: string;
  displayName: string;
  version: string;
  developerName: string;
  info: string;
  isUse: boolean;
  disabled: boolean;  // 是否已禁用
  path: string;
  originalPath?: string;  // 禁用前的原路径
}

const data = ref<DataItem[]>([]);

// 模组数量
const modCount = computed(() => {
  return data.value.length;
});

// 处理搜索
const handleSearch = (value: string) => {
  const trimmed = value.trim();
  
  if (!trimmed) {
    // 搜索为空，退出搜索模式，显示当前目录层级的全部内容
    searchMode.value = false;
    selectedKeys.value = ['all'];
    data.value = rawTreeData.value.flatMap(node => flattenMods(node));
    return;
  }
  
  // 搜索内容，先选中全部
  selectedKeys.value = ['all'];
  searchMode.value = true;
  
  // 获取全部 mod 并过滤
  const allMods = rawTreeData.value.flatMap(node => flattenMods(node));
  const lowerSearch = trimmed.toLowerCase();
  
  data.value = allMods.filter(mod => {
    const nameMatch = mod.displayName.toLowerCase().includes(lowerSearch);
    const devMatch = mod.developerName.toLowerCase().includes(lowerSearch);
    const infoMatch = mod.info.toLowerCase().includes(lowerSearch);
    return nameMatch || devMatch || infoMatch;
  });
};

// 递归获取所有 mod
const getAllMods = (nodes: ModTreeNode[]): ModTreeNode[] => {
  let mods: ModTreeNode[] = [];
  for (const node of nodes) {
    // 如果是 mod 节点，直接添加
    if (node.isMod) {
      mods.push(node);
    }
    // 如果有子节点，递归处理
    if (node.children && node.children.length > 0) {
      mods = mods.concat(getAllMods(node.children));
    }
  }
  return mods;
};

// 直接从目录结构提取所有 mods（用于禁用目录）
const extractModsFromTree = (nodes: ModTreeNode[]): ModTreeNode[] => {
  let mods: ModTreeNode[] = [];
  for (const node of nodes) {
    // 如果是 mod 节点（isMod 为 true）或者是文件夹（有 children），都尝试获取其下的 mods
    if (node.isMod) {
      mods.push(node);
    }
    // 递归处理子节点
    if (node.children && node.children.length > 0) {
      mods = mods.concat(extractModsFromTree(node.children));
    }
  }
  return mods;
};

// 递归获取指定路径下的所有 mod
const getModsByPath = (nodes: ModTreeNode[], targetPath: string): ModTreeNode[] => {
  for (const node of nodes) {
    if (node.path === targetPath) {
      // 找到了目标节点，返回其下所有 mod
      return getAllMods(node.children || []);
    }
    if (node.children && node.children.length > 0) {
      const found = getModsByPath(node.children, targetPath);
      if (found.length > 0) {
        return found;
      }
    }
  }
  return [];
};

// 截断过长的名称
const truncateText = (text: string, maxLength: number = 15): string => {
  if (text.length > maxLength) {
    return text.slice(0, maxLength) + '...';
  }
  return text;
};

// 转换数据为 Ant Design Tree 格式（不截断）
const transformToAntTree = (nodes: ModTreeNode[], parentPath: string = '', isDisabled: boolean = false): ModTreeNode[] => {
  return nodes.map((node) => {
    const key = parentPath ? `${parentPath}/${node.title}` : node.title;
    const newNode: any = {
      title: truncateText(node.title),
      key: key,
      path: node.path,
      isMod: node.isMod,
      originTitle: node.title,
      isDisabled: isDisabled,  // 使用 isDisabled 避免与 Ant Tree 的 disabled 冲突
      scopedSlots: {
        icon: node.isMod ? 'FileTextOutlined' : 'FolderOutlined'
      }
    };
    if (node.children && node.children.length > 0) {
      newNode.children = transformToAntTree(node.children, key, isDisabled);
    }
    return newNode;
  });
};

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

    // 并行扫描启用和禁用的 mods
    const [enabledResult, disabledResult] = await Promise.all([
      window.windowApi.scanModsDirectory(settings.dcsPath),
      window.windowApi.scanDisabledModsDirectory(settings.dcsPath)
    ]);

    if (enabledResult.success && enabledResult.tree) {
      // 保存原始数据
      rawTreeData.value = enabledResult.tree;
      
      // 处理禁用的 mods 树
      let disabledModsList: DataItem[] = [];
      if (disabledResult.success && disabledResult.tree && disabledResult.tree.length > 0) {
        rawDisabledTreeData.value = disabledResult.tree;
        // 提取禁用的 mods 列表
        const disabledNodes = extractModsFromTree(disabledResult.tree);
        disabledModsList = disabledNodes.map((node, index) => {
          const originalPath = disablePathToOriginalPath(node.path, settings.dcsPath);
          return {
            key: 'disabled_' + index + '_' + node.key,
            displayName: node.displayName || node.originTitle || node.title,
            version: node.version || '未知',
            developerName: node.developerName || '未知',
            info: node.info || '未知',
            isUse: false,
            disabled: true,
            path: node.path,
            originalPath: originalPath
          };
        });
      }

      // 构建树数据（启用 mods 和禁用 mods）
      const enabledTreeChildren = transformToAntTree(enabledResult.tree, 'all');
      
      // 处理禁用的 mods，转换为树节点
      let disabledTreeChildren: ModTreeNode[] = [];
      if (disabledResult.success && disabledResult.tree && disabledResult.tree.length > 0) {
        // 将禁用的 mods 树转换，添加禁用标记
        disabledTreeChildren = transformToAntTree(disabledResult.tree, 'disabled', true);
      }
      
      // 合并树数据（启用和禁用）
      const allChildren = [...enabledTreeChildren];
      if (disabledTreeChildren.length > 0) {
        allChildren.push({
          title: '已禁用',
          key: 'disabled',
          path: '',
          isMod: false,
          isDisabled: true,
          scopedSlots: { icon: 'StopOutlined' },
          children: disabledTreeChildren
        });
      }
      
      treeData.value = [
        {
          title: '全部',
          key: 'all',
          path: '',
          isMod: false,
          scopedSlots: { icon: 'SnippetsOutlined' },
          children: allChildren
        }
      ];
      expandedKeys.value = ['all'];
      selectedKeys.value = ['all'];

      // 构建启用 mods 列表
      const enabledMods = rawTreeData.value.flatMap(node => flattenMods(node));

      // 合并显示所有 mods（启用 + 禁用）
      data.value = [...enabledMods, ...disabledModsList];
      message.success(`模组目录加载成功（${enabledMods.length} 个启用，${disabledModsList.length} 个禁用）`);
    } else {
      message.error(enabledResult.error || '扫描失败');
    }
  } catch (error) {
    console.error('扫描 Mods 目录失败:', error);
    message.error('扫描失败: ' + (error as Error).message);
  } finally {
    loading.value = false;
  }
};

// 扁平化获取所有 mod
const flattenMods = (node: ModTreeNode, isDisabled: boolean = false): DataItem[] => {
  let result: DataItem[] = [];
  if (node.isMod) {
    result.push({
      key: node.key,
      displayName: node.displayName || node.originTitle || node.title,
      version: node.version || '未知',
      developerName: node.developerName || '未知',
      info: node.info || '未知',
      isUse: !isDisabled,
      disabled: isDisabled,
      path: node.path
    });
  }
  if (node.children) {
    for (const child of node.children) {
      result = result.concat(flattenMods(child, isDisabled));
    }
  }
  return result;
};

// 处理树节点选择
const handleTreeSelect = (keys: string[]) => {
  selectedKeys.value = keys;

  // 如果之前是搜索模式，清除搜索
  if (searchMode.value) {
    searchMode.value = false;
    searchText.value = '';
  }

  if (keys.length === 0) {
    data.value = [];
    return;
  }

  const selectedKey = keys[0];

  if (selectedKey === 'all') {
    // 显示全部（启用 + 禁用）
    const enabledMods = rawTreeData.value.flatMap(node => flattenMods(node));
    const disabledMods = rawDisabledTreeData.value.flatMap(node => flattenMods(node, true));
    data.value = [...enabledMods, ...disabledMods];
  } else if (selectedKey === 'disabled') {
    // 显示所有禁用的 mods
    data.value = rawDisabledTreeData.value.flatMap(node => flattenMods(node, true));
  } else if (selectedKey.startsWith('disabled/')) {
    // 禁用区域的节点
    const searchKey = selectedKey.substring(9); // 去掉 "disabled/" 前缀
    const node = findNodeByKey(rawDisabledTreeData.value, 'disabled/' + searchKey);
    if (node) {
      if (node.isMod) {
        data.value = [{
          key: selectedKey,
          displayName: node.displayName || node.originTitle || node.title,
          version: node.version || '未知',
          developerName: node.developerName || '未知',
          info: node.info || '未知',
          isUse: false,
          disabled: true,
          path: node.path
        }];
      } else {
        data.value = (node.children || []).flatMap(child => flattenMods(child, true));
      }
    }
  } else {
    // 启用区域的节点
    const node = findNodeByKey(rawTreeData.value, selectedKey);
    if (node) {
      if (node.isMod) {
        data.value = [{
          key: node.key,
          displayName: node.displayName || node.originTitle || node.title,
          version: node.version || '未知',
          developerName: node.developerName || '未知',
          info: node.info || '未知',
          isUse: true,
          disabled: false,
          path: node.path
        }];
      } else {
        data.value = (node.children || []).flatMap(child => flattenMods(child, false));
      }
    }
  }
};

// 根据 key 查找节点（支持带前缀的 key）
const findNodeByKey = (nodes: ModTreeNode[], key: string): ModTreeNode | null => {
  // 去掉可能的 "all/" 或 "disabled/" 前缀来匹配原始 key
  let searchKey = key;
  if (key.startsWith('all/')) {
    searchKey = key.substring(4);
  } else if (key.startsWith('disabled/')) {
    searchKey = key.substring(9);
  }
  
  for (const node of nodes) {
    // 匹配原始 key（不带前缀）
    if (node.key === searchKey) {
      return node;
    }
    // 匹配带 disabled/ 前缀的 key（用于已转换的树）
    if (node.key === key || node.key === 'disabled/' + searchKey) {
      return node;
    }
    if (node.children && node.children.length > 0) {
      const found = findNodeByKey(node.children, key);
      if (found) {
        return found;
      }
    }
  }
  return null;
};

// 刷新模组列表
const refreshMods = () => {
  scanModsDirectory();
};

// 禁用选中的 mods
const handleDisableMods = () => {
  if (selectedMods.value.length === 0) {
    message.warning('请先选择要禁用的模组');
    return;
  }

  const modNames = selectedMods.value.map(m => m.displayName).join('、');
  const count = selectedMods.value.length;

  Modal.confirm({
    title: '确认禁用',
    content: `确定要禁用以下 ${count} 个模组吗？\n${modNames}\n\n禁用后模组将被移动到 disable_mods 文件夹。`,
    okText: '确认禁用',
    cancelText: '取消',
    onOk: async () => {
      disabling.value = true;
      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      try {
        for (const mod of selectedMods.value) {
          if (mod.disabled) continue;  // 跳过已禁用的

          const result = await window.windowApi?.disableMod(mod.path);
          if (result?.success) {
            successCount++;
            // 更新表格数据，标记为已禁用
            const index = data.value.findIndex(m => m.key === mod.key);
            if (index !== -1) {
              // 保存原始路径用于后续可能恢复
              data.value[index] = {
                ...data.value[index],
                isUse: false,
                disabled: true,
                originalPath: mod.path
              };
            }
          } else {
            failCount++;
            errors.push(`${mod.displayName}: ${result?.error || '未知错误'}`);
          }
        }

        // 清理选中状态
        selectedMods.value = [];

        if (successCount > 0) {
          message.success(`成功禁用 ${successCount} 个模组`);
          // 禁用成功后刷新模组列表
          await scanModsDirectory();
        }
        if (failCount > 0) {
          message.error(`禁用失败 ${failCount} 个模组: ${errors.join('; ')}`);
        }
      } catch (error) {
        message.error('禁用失败: ' + (error as Error).message);
      } finally {
        disabling.value = false;
      }
    }
  });
};

// 启用选中的 mods（从 disable_mods 移回）
const handleEnableMods = () => {
  if (selectedDisabledMods.value.length === 0) {
    message.warning('请先选择要启用的模组（已禁用的模组）');
    return;
  }

  const modNames = selectedDisabledMods.value.map(m => m.displayName).join('、');
  const count = selectedDisabledMods.value.length;

  Modal.confirm({
    title: '确认启用',
    content: `确定要启用以下 ${count} 个模组吗？\n${modNames}\n\n启用后模组将被移动回 Mods 文件夹。`,
    okText: '确认启用',
    cancelText: '取消',
    onOk: async () => {
      enabling.value = true;
      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      try {
        // 获取设置（只获取一次）
        const settings = await window.windowApi?.getSettings();
        if (!settings?.dcsPath) {
          message.error('未配置 DCS 路径');
          return;
        }

        // 将反斜杠路径转为正斜杠以便统一处理
        const normalizedDcsPath = settings.dcsPath.replace(/\\/g, '/');
        const normalizedModsPath = normalizedDcsPath + '/Mods';

        for (const mod of selectedDisabledMods.value) {
          if (!mod.disabled) continue;

          // 从 originalPath 提取相对于 Mods 的路径
          // originalPath 格式: D:/DCS/Mods/aircraft/Su-35
          // 需要得到: aircraft/Su-35
          let relativePath = '';
          if (mod.originalPath) {
            const normalizedOriginal = mod.originalPath.replace(/\\/g, '/');
            if (normalizedOriginal.startsWith(normalizedModsPath + '/')) {
              relativePath = normalizedOriginal.substring(normalizedModsPath.length + 1);
            } else {
              // 如果格式不对，尝试从 path 字段提取
              relativePath = mod.path.replace(/\\/g, '/').split('/disable_mods/')[1] || '';
            }
          } else if (mod.path) {
            // 使用 path 中 disable_mods 后面的部分
            const pathParts = mod.path.replace(/\\/g, '/').split('/disable_mods/');
            relativePath = pathParts[1] || '';
          }

          if (!relativePath) {
            failCount++;
            errors.push(`${mod.displayName}: 无法确定模组路径`);
            continue;
          }

          // 传递禁用路径和原始路径到后端
          const result = await window.windowApi?.enableMod(relativePath, mod.originalPath);
          if (result?.success) {
            successCount++;
          } else {
            failCount++;
            errors.push(`${mod.displayName}: ${result?.error || '未知错误'}`);
          }
        }

        // 清理选中状态
        selectedDisabledMods.value = [];

        if (successCount > 0) {
          message.success(`成功启用 ${successCount} 个模组`);
          // 启用成功后刷新模组列表
          await scanModsDirectory();
        }
        if (failCount > 0) {
          message.error(`启用失败 ${failCount} 个模组: ${errors.join('; ')}`);
        }
      } catch (error) {
        message.error('启用失败: ' + (error as Error).message);
      } finally {
        enabling.value = false;
      }
    }
  });
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
        onChange: (_selectedRowKeys: string[], selectedRows: DataItem[]) => {
          selectedMods.value = selectedRows.filter(row => !row.disabled);
          selectedDisabledMods.value = selectedRows.filter(row => row.disabled);
        }
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