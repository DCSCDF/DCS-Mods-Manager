<template>
        <div class="m-5">

                <div class="mb-6">
                        <h1 class="text-2xl text-gray-800 mb-2! font-medium">
                                玩家Mod 管理
                        </h1>
                        <p  class="text-gray-500 mb-6">
                                这里是 DCS 的保存的游戏中的mod管理内容区域
                        </p>
                </div>

                <!-- 删除确认对话框 -->
                <a-modal
                        v-model:open="deleteModalVisible"
                        :title="'确认删除 - ' + (deleteModalInfo?.mod?.displayName || '')"
                        :okText="deleteMode === 'folder' ? '删除整个文件夹' : '只删除 Lua 文件'"
                        :cancelText="'取消'"
                        :confirmLoading="deleting"
                        @ok="handleDeleteConfirm"
                        @cancel="deleteModalVisible = false"
                >
                        <div v-if="deleteModalInfo">
                                <p style="margin-bottom: 12px">该文件夹下还有 {{ deleteModalInfo.otherModCount }} 个其他模组。请选择删除方式：</p>
                                <a-radio-group v-model:value="deleteMode">
                                        <a-radio  value="lua">只删除 Lua 文件</a-radio>
                                        <a-radio value="folder" style="margin-bottom: 8px">删除整个文件夹</a-radio>
                                </a-radio-group>
                        </div>
                </a-modal>


                        <div class="flex items-center justify-between mb-3">
                                <div class="flex gap-4">
                                        <a-select
                                            v-model:value="statusFilter"
                                            style="width: 100px"
                                            @change="handleStatusFilterChange"
                                        >
                                                <a-select-option value="all">全部</a-select-option>
                                                <a-select-option value="enabled">启用</a-select-option>
                                                <a-select-option value="disabled">禁用</a-select-option>
                                        </a-select>

                                        <a-input-search
                                            v-model:value="searchText"
                                            placeholder="搜索模组名称、作者、简介"
                                            style="width: 250px"
                                            @search="handleSearch"
                                        />

                                        <a-radio-group>
                                                <a-radio-button value="large" @click="handleDisableMods" :disabled="selectedMods.length === 0" :loading="disabling">禁用</a-radio-button>
                                                <a-radio-button value="default" @click="handleEnableMods" :disabled="selectedDisabledMods.length === 0" :loading="enabling">启用</a-radio-button>
                                                <a-radio-button value="default" @click="handleDeleteMods" :disabled="selectedMods.length === 0" :loading="deleting">删除</a-radio-button>
                                        </a-radio-group>


                                </div>
                                <div class="flex gap-4">
<!--                                        <a-radio-group>-->
<!--                                                <a-radio-button :disabled="true" value="large">-->
<!--                                                        <ExportOutlined />-->
<!--                                                </a-radio-button>-->
<!--                                                <a-radio-button :disabled="true" value="default">-->
<!--                                                        <UploadOutlined />-->
<!--                                                </a-radio-button>-->
<!--&lt;!&ndash;                                                <a-radio-button value="small">&ndash;&gt;-->
<!--&lt;!&ndash;                                                        <DeleteOutlined />&ndash;&gt;-->
<!--&lt;!&ndash;                                                </a-radio-button>&ndash;&gt;-->
<!--                                        </a-radio-group>-->
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
import { ReloadOutlined} from '@ant-design/icons-vue';

import { ref, onMounted, computed, h } from 'vue';
import { Modal, message,  } from 'ant-design-vue';


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
const deleting = ref(false);
const searchText = ref('');
const searchMode = ref(false);
const statusFilter = ref('all');  // 状态筛选: all | enabled | disabled
const selectedMods = ref<DataItem[]>([]);
const selectedDisabledMods = ref<DataItem[]>([]);  // 选中的已禁用 mods

// 删除模态框相关
const deleteModalVisible = ref(false);
const deleteModalInfo = ref<{ mod: DataItem; otherModCount: number; luaFileCount: number } | null>(null);
const deleteMode = ref<'folder' | 'lua'>('folder');

// 模组目录树数据
interface ModTreeNode {
  title: string
  key: string
  path: string
  isMod: boolean
  isCategory?: boolean
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
    // 根据状态筛选显示数据
    if (statusFilter.value === 'all') {
      const enabledMods = rawTreeData.value.flatMap(node => flattenMods(node));
      const disabledMods = rawDisabledTreeData.value.flatMap(node => flattenMods(node, true));
      data.value = [...enabledMods, ...disabledMods];
    } else if (statusFilter.value === 'enabled') {
      data.value = rawTreeData.value.flatMap(node => flattenMods(node));
    } else {
      data.value = rawDisabledTreeData.value.flatMap(node => flattenMods(node, true));
    }
    return;
  }

  // 搜索内容，先选中全部
  selectedKeys.value = ['all'];
  searchMode.value = true;

  // 获取全部 mod 并过滤（启用 + 禁用）
  const enabledMods = rawTreeData.value.flatMap(node => flattenMods(node));
  const disabledMods = rawDisabledTreeData.value.flatMap(node => flattenMods(node, true));
  const allMods = [...enabledMods, ...disabledMods];
  const lowerSearch = trimmed.toLowerCase();

  let result = allMods.filter(mod => {
    const nameMatch = mod.displayName.toLowerCase().includes(lowerSearch);
    const devMatch = mod.developerName.toLowerCase().includes(lowerSearch);
    const infoMatch = mod.info.toLowerCase().includes(lowerSearch);
    return nameMatch || devMatch || infoMatch;
  });

  // 应用状态筛选
  if (statusFilter.value !== 'all') {
    if (statusFilter.value === 'enabled') {
      result = result.filter(mod => !mod.disabled);
    } else if (statusFilter.value === 'disabled') {
      result = result.filter(mod => mod.disabled);
    }
  }

  data.value = result;
};

// 处理状态筛选变化
const handleStatusFilterChange = () => {
  // 清除搜索状态
  searchMode.value = false;
  searchText.value = '';

  // 根据当前选中的目录和筛选条件刷新数据
  handleTreeSelect(selectedKeys.value);
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
      isCategory: node.isCategory,
      originTitle: node.title,
      isDisabled: isDisabled,
      displayName: node.displayName,
      version: node.version,
      developerName: node.developerName,
      info: node.info,
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

// 获取所有有效的树节点 key
const getAllTreeKeys = (nodes: any[]): Set<string> => {
  const keys = new Set<string>();
  const collectKeys = (nodeList: any[]) => {
    for (const node of nodeList) {
      keys.add(node.key);
      if (node.children && node.children.length > 0) {
        collectKeys(node.children);
      }
    }
  };
  collectKeys(nodes);
  return keys;
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
      
      const newTreeData = [
        {
          title: '全部',
          key: 'all',
          path: '',
          isMod: false,
          scopedSlots: { icon: 'SnippetsOutlined' },
          children: allChildren
        }
      ];
      
      treeData.value = newTreeData;
      
      // 过滤 expandedKeys，只保留存在于新树中的 key（兼容有无 "all/" 前缀的 key）
      const validKeys = getAllTreeKeys(newTreeData);
      expandedKeys.value = expandedKeys.value.filter(key => {
        // 直接匹配，或去掉前缀后匹配，或加上前缀后匹配
        const withoutAll = key.startsWith('all/') ? key.substring(4) : key;
        const withAll = 'all/' + key;
        return validKeys.has(key) || validKeys.has(withoutAll) || validKeys.has(withAll);
      });
      
      // 如果没有展开任何节点，展开 "全部"
      if (expandedKeys.value.length === 0) {
        expandedKeys.value = ['all'];
      }

      // 自动展开包含子 mod 的容器节点
      const autoExpandContainerKeys = (nodes: any[], parentKeys: string[] = []) => {
        for (const node of nodes) {
          if (!node.isMod && node.children && node.children.length > 0) {
            // 检查是否包含 isMod 为 true 的子节点
            const hasModChild = (children: any[]): boolean => {
              return children.some(child => child.isMod || (child.children && hasModChild(child.children)));
            };
            if (hasModChild(node.children)) {
              expandedKeys.value.push(node.key);
            }
            autoExpandContainerKeys(node.children, [...parentKeys, node.key]);
          }
        }
      };
      autoExpandContainerKeys(allChildren);
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
  
  // 跳过 "_main" 文件夹（主目录），避免重复显示
  // _main 是 DCS 内部结构，实际内容在其子目录中
  if (node.isMod && node.title && node.title.endsWith('(主目录)')) {
    // _main 文件夹会被跳过，但它的子目录（如 MOD 文件夹）会被正常处理
    console.log('[flattenMods] 跳过 _main (主目录) 文件夹:', node.key);
    if (node.children) {
      for (const child of node.children) {
        result = result.concat(flattenMods(child, isDisabled));
      }
    }
    return result;
  }
  
  if (node.isMod) {
    // 优先使用 displayName，其次使用 title
    const modName = node.displayName || node.title || node.originTitle || '未知';
    console.log('[flattenMods] 处理 MOD:', node.key, 'displayName:', JSON.stringify(node.displayName), 'title:', node.title, '最终名称:', modName);
    result.push({
      key: node.key,
      displayName: modName,
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
  console.log('[handleTreeSelect] keys:', keys);
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
  let result: DataItem[] = [];

  if (selectedKey === 'all') {
    // 显示全部（启用 + 禁用）
    const enabledMods = rawTreeData.value.flatMap(node => flattenMods(node));
    const disabledMods = rawDisabledTreeData.value.flatMap(node => flattenMods(node, true));
    result = [...enabledMods, ...disabledMods];
  } else if (selectedKey === 'disabled') {
    // 显示所有禁用的 mods
    result = rawDisabledTreeData.value.flatMap(node => flattenMods(node, true));
  } else if (selectedKey.startsWith('disabled/')) {
    // 禁用区域的节点
    const searchKey = selectedKey.substring(9); // 去掉 "disabled/" 前缀
    const node = findNodeByKey(rawDisabledTreeData.value, 'disabled/' + searchKey);
    if (node) {
      if (node.isMod && !node.isCategory) {
        result = [{
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
        result = (node.children || []).flatMap(child => flattenMods(child, true));
      }
    }
  } else {
    // 启用区域的节点 - 去掉 "all/" 前缀
    let searchKey = selectedKey.startsWith('all/') ? selectedKey.substring(4) : selectedKey;
    
    // 检查是否是 MOD 节点的 "(主目录)" 选择
    // 格式1: aircraft/IRIAF_-_Asia_Minor/IRIAF_-_Asia_Minor (主目录)
    //        正则: 捕获 (父路径) + (MOD名) + "/" + (重复的MOD名) + " (主目录)"
    // 格式2: aircraft/aircraft (主目录) - 分类节点的 (主目录)
    //        正则: 捕获 (父路径) + "/" + (MOD名) + " (主目录)"
    const mainDirMatch = searchKey.match(/^(.+)\/([^/]+)\/\2 \(主目录\)$/);
    const categoryMainDirMatch = !mainDirMatch ? searchKey.match(/^(.+)\/([^/]+) \(主目录\)$/) : null;
    console.log('[handleTreeSelect] searchKey:', searchKey, 'mainDirMatch:', mainDirMatch, 'categoryMainDirMatch:', categoryMainDirMatch);
    if (mainDirMatch || categoryMainDirMatch) {
      const match = mainDirMatch || categoryMainDirMatch!;
      const parentPath = match[1];
      const modName = match[2];
      console.log('[handleTreeSelect] 检测到 (主目录) 选择, parentPath:', parentPath, 'modName:', modName);

      // 检查是否是 _main 节点（用于查看 MOD 分类目录下的所有子 MOD）
      // _main 节点的 key 格式是: modKey/_main
      // 例如: aircraft/_main, aircraft/IRIAF_-_Asia_Minor/_main
      let searchNodeKey = parentPath + '/' + modName;

      // 如果 parentPath === modName（如 aircraft/aircraft），实际 key 就是 parentPath
      if (parentPath === modName) {
        searchNodeKey = parentPath;
      }

      if (searchNodeKey.endsWith('/_main')) {
        // 这是 _main 节点，实际对应父 MOD 节点
        const parentKey = parentPath; // aircraft/_main -> aircraft
        console.log('[handleTreeSelect] _main 节点，实际查找父节点:', parentKey);
        const parentNode = findNodeByKey(rawTreeData.value, parentKey);
        if (parentNode) {
          console.log('[handleTreeSelect] 找到父节点:', parentNode.key, 'isMod:', parentNode.isMod, 'isCategory:', parentNode.isCategory, 'children count:', parentNode.children?.length);
          // 显示父节点下的所有子 MOD
          result = parentNode.children.flatMap(child => flattenMods(child, false));
        }
      } else {
        // 点击 (主目录) 应该显示当前 MOD 自身
        console.log('[handleTreeSelect] 查找节点 key:', searchNodeKey);
        const node = findNodeByKey(rawTreeData.value, searchNodeKey);
        if (node) {
          console.log('[handleTreeSelect] 找到节点:', node.key, 'isMod:', node.isMod, 'isCategory:', node.isCategory, 'children count:', node.children?.length);
          // 无论是否是 category，只要节点有 _main 子节点，就显示 MOD 自身
          if (node.isMod) {
            result = [{
              key: node.key,
              displayName: node.displayName || node.title,
              version: node.version || '未知',
              developerName: node.developerName || '未知',
              info: node.info || '未知',
              isUse: true,
              disabled: false,
              path: node.path
            }];
          } else if (node.children) {
            result = node.children.flatMap(child => flattenMods(child, false));
          }
        }
      }
    } else {
      // 普通节点选择
      console.log('[handleTreeSelect] 普通节点选择, searchKey:', searchKey);
      const node = findNodeByKey(rawTreeData.value, searchKey);
      if (node) {
        console.log('[handleTreeSelect] 找到节点:', node.key, 'isMod:', node.isMod, 'isCategory:', node.isCategory, 'children count:', node.children?.length, 'displayName:', node.displayName);
        // 如果是 MOD 节点（无论是否有子 MOD），显示 MOD 信息
        if (node.isMod) {
          result = [{
            key: node.key,
            displayName: node.displayName || node.title,
            version: node.version || '未知',
            developerName: node.developerName || '未知',
            info: node.info || '未知',
            isUse: true,
            disabled: false,
            path: node.path
          }];
        } else if (node.children) {
          // 非 MOD 分类节点，显示子节点
          result = node.children.flatMap(child => flattenMods(child, false));
        }
      }
    }
  }

  console.log('[handleTreeSelect] result:', result);

  // 应用状态筛选
  if (statusFilter.value !== 'all') {
    if (statusFilter.value === 'enabled') {
      result = result.filter(mod => !mod.disabled);
    } else if (statusFilter.value === 'disabled') {
      result = result.filter(mod => mod.disabled);
    }
  }

  console.log('[handleTreeSelect] 最终 result:', result);
  data.value = result;
};

// 根据 key 查找节点（支持带前缀的 key）
const findNodeByKey = (nodes: ModTreeNode[], key: string): ModTreeNode | null => {
  // 去掉 "all/" 或 "disabled/" 前缀
  let searchKey = key;
  if (key.startsWith('all/')) {
    searchKey = key.substring(4);
  } else if (key.startsWith('disabled/')) {
    searchKey = key.substring(9);
  }

  // 分割路径，逐层查找
  const parts = searchKey.split('/');

  console.log('[findNodeByKey] 开始查找, searchKey:', searchKey, 'parts:', parts, '原始nodes数量:', nodes.length);

  let currentNodes = nodes;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const isLastPart = (i === parts.length - 1);

    // 拼接当前层级的完整 key
    const currentKey = parts.slice(0, i + 1).join('/');
    console.log('[findNodeByKey] 层级', i, ': part=', part, 'currentKey=', currentKey, '当前层级节点数:', currentNodes.length);

    let found: ModTreeNode | null = null;

    // 精确匹配当前层级的完整 key
    for (const node of currentNodes) {
      console.log('[findNodeByKey]   检查节点: key=', node.key, 'title=', node.title);
      if (node.key === currentKey) {
        found = node;
        break;
      }
    }

    if (!found) {
      console.log('[findNodeByKey] 未找到节点 currentKey:', currentKey);
      return null;
    }

      console.log('[findNodeByKey] 找到节点:', found.key, 'isMod:', found.isMod, 'isCategory:', found.isCategory, 'children:', found.children?.map(c => c.key));

    // 如果是最后一部分，返回找到的节点
    if (isLastPart) {
      return found;
    }

    // 否则继续在子节点中查找
    currentNodes = found.children || [];
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

// 删除 mod
const handleDeleteMods = () => {
  if (selectedMods.value.length === 0) {
    message.warning('请先选择要删除的模组');
    return;
  }

  const mod = selectedMods.value[0]; // 一次只删除一个
  const modName = mod.displayName;

  deleting.value = true;
  deleteMode.value = 'lua'; // 重置为默认

  // 先检查是否有其他 mod
  window.windowApi?.checkModDelete(mod.path).then(async (checkResult: any) => {
    if (!checkResult?.success) {
      message.error(checkResult?.error || '检查失败');
      deleting.value = false;
      return;
    }

    if (checkResult.hasOtherMods) {
      // 有其他 mod，使用 a-modal 显示对话框
      deleteModalInfo.value = {
        mod: mod,
        otherModCount: checkResult.otherModCount,
        luaFileCount: checkResult.luaFileCount
      };
      deleteModalVisible.value = true;
    } else {
      // 没有其他 mod，直接确认删除文件夹
      Modal.confirm({
        title: '确认删除',
        content: `确定要删除 "${modName}" 吗？此操作不可恢复。`,
        okText: '删除',
        cancelText: '取消',
        onOk: async () => {
          await confirmDeleteFolder(mod.path, modName);
        }
      });
    }
    deleting.value = false;
  }).catch((error: any) => {
    message.error('检查失败: ' + error.message);
    deleting.value = false;
  });
};

// 处理删除确认
const handleDeleteConfirm = async () => {
  if (!deleteModalInfo.value) return;

  const mod = deleteModalInfo.value.mod;
  const modName = mod.displayName;

  deleteModalVisible.value = false;

  if (deleteMode.value === 'folder') {
    await confirmDeleteFolder(mod.path, modName);
  } else {
    await confirmDeleteLua(mod.path, modName);
  }
};

// 确认删除整个文件夹
const confirmDeleteFolder = async (modPath: string, modName: string) => {
  deleting.value = true;
  try {
    const result: any = await window.windowApi?.deleteModFolder(modPath);
    if (result?.success) {
      message.success(`"${modName}" 已删除`);
      // 清理选中状态
      selectedMods.value = [];
      // 刷新列表
      await scanModsDirectory();
    } else {
      message.error(result?.error || '删除失败');
    }
  } catch (error) {
    message.error('删除失败: ' + (error as Error).message);
  } finally {
    deleting.value = false;
  }
};

// 确认只删除 Lua 文件
const confirmDeleteLua = async (modPath: string, modName: string) => {
  deleting.value = true;
  try {
    const result: any = await window.windowApi?.deleteModLua(modPath);
    if (result?.success) {
      message.success(`"${modName}" 的 Lua 文件已删除 (${result.deletedCount} 个文件)`);
      // 清理选中状态
      selectedMods.value = [];
      // 刷新列表
      await scanModsDirectory();
    } else {
      message.error(result?.error || '删除失败');
    }
  } catch (error) {
    message.error('删除失败: ' + (error as Error).message);
  } finally {
    deleting.value = false;
  }
};

// 检查路径是否有效（确保只检查一次）
let hasCheckedPath = false;
const checkPath = async () => {
        if (hasCheckedPath) {
                return true;
        }
        hasCheckedPath = true;

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