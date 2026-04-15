<template>
        <a-layout-header :style="headerStyle">
                <div class="drag-region">
                        <span class="app-title">DCS Mods Manager</span>
                        <div class="window-controls">
                                <a-tooltip title="最小化">
                                        <button class="control-btn minimize" @click="minimizeWindow">
                                                <MinusOutlined />
                                        </button>
                                </a-tooltip>
                                <a-tooltip title="最大化">
                                        <button class="control-btn maximize" @click="maximizeWindow">
                                                <BorderOutlined v-if="!isMaximized" />
                                                <FullscreenExitOutlined v-else />
                                        </button>
                                </a-tooltip>
                                <a-tooltip title="关闭">
                                        <button class="control-btn close" @click="closeWindow">
                                                <CloseOutlined />
                                        </button>
                                </a-tooltip>
                        </div>
                </div>
        </a-layout-header>
</template>
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { MinusOutlined, BorderOutlined, CloseOutlined, FullscreenExitOutlined } from '@ant-design/icons-vue';

const isMaximized = ref(false);

const headerStyle = {
        color: '#fff',
        height: '40px',
        paddingInline: '0px',
        lineHeight: '40px',
        backgroundColor: '#2276ae',
};

const minimizeWindow = () => {
  window.windowApi.minimize();
};

const maximizeWindow = () => {
  if (isMaximized.value) {
    window.windowApi.unmaximize();
  } else {
    window.windowApi.maximize();
  }
  // 不在这里切换状态，而是等待 IPC 事件 'window-maximized' 来更新
};

const closeWindow = () => {
  window.windowApi.close();
};

onMounted(() => {
  window.windowApi.isMaximized().then((maximized) => {
    isMaximized.value = maximized;
  });

  // 监听窗口最大化/还原状态变化
  const removeListener = window.ipcRenderer.on('window-maximized', (_, isMaximizedState: boolean) => {
    isMaximized.value = isMaximizedState;
  });

  // 保存移除函数，在组件卸载时调用
  (window as any).__removeWindowMaximizedListener = removeListener;
});

onUnmounted(() => {
  // 移除事件监听
  const removeListener = (window as any).__removeWindowMaximizedListener;
  if (removeListener) {
    removeListener();
  }
});
</script>
<style scoped>
.drag-region {
        display: flex;
        justify-content: space-between;
        align-items: center;
        height: 100%;
        -webkit-app-region: drag;
        padding: 0 10px;
}

.app-title {
        font-weight: 500;
        font-size: 14px;
        -webkit-app-region: no-drag;
}

.window-controls {
        display: flex;
        gap: 0;
        -webkit-app-region: no-drag;
}

.control-btn {
        width: 40px;
        height: 40px;
        border: none;
        background: transparent;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s;
}

.control-btn:hover {
        background-color: rgba(0, 0, 0, 0.1);
}

.control-btn.close:hover {
        background-color: #e81123;
        color: white;
}

.control-btn:active {
        background-color: rgba(0, 0, 0, 0.2);
}

.control-btn.close:active {
        background-color: #bf0f1d;
}
</style>