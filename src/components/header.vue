<template>
  <a-layout-header :style="headerStyle" >
    <div class="drag-region flex justify-between items-center h-full px-2.5 border-b border-neutral-200">
      <span class="app-title font-medium text-sm no-drag">DCS Mods Manager</span>
      <div class="window-controls flex gap-0 no-drag">

          <button class="control-btn w-10 h-10 border-none bg-transparent cursor-pointer flex items-center justify-center transition-colors duration-200 hover:bg-black/10" @click="minimizeWindow">
            <MinusOutlined />
          </button>

          <button class="control-btn w-10 h-10 border-none bg-transparent cursor-pointer flex items-center justify-center transition-colors duration-200 hover:bg-black/10" @click="maximizeWindow">
            <BorderOutlined v-if="!isMaximized" />
            <FullscreenExitOutlined v-else />
          </button>

          <button class="control-btn w-10 h-10 border-none bg-transparent cursor-pointer flex items-center justify-center transition-colors duration-200 hover:bg-[#e81123] hover:text-white active:bg-[#bf0f1d]" @click="closeWindow">
            <CloseOutlined />
          </button>

      </div>
    </div>
  </a-layout-header>
</template>
<script setup lang="ts">
import {onMounted, onUnmounted, ref} from 'vue';
import {BorderOutlined, CloseOutlined, FullscreenExitOutlined, MinusOutlined} from '@ant-design/icons-vue';

const isMaximized = ref(false);

const headerStyle = {
  color: '#3e3e3e',
  height: '40px',
  paddingInline: '0px',
  lineHeight: '40px',
  backgroundColor: '#f8f8f8',
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
  window.windowApi.isMaximized().then((maximized: boolean) => {
    isMaximized.value = maximized;
  });

  // 监听窗口最大化/还原状态变化
  // 保存移除函数，在组件卸载时调用
  (window as any).__removeWindowMaximizedListener = window.ipcRenderer.on('window-maximized', (_, isMaximizedState: boolean) => {
    isMaximized.value = isMaximizedState;
  });
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
  -webkit-app-region: drag;
}
.no-drag {
  -webkit-app-region: no-drag;
}
</style>
