<template>
        <div class="m-5">

                <div class="mb-5">
                        <h1 class="text-2xl text-gray-800 mb-2! font-medium">
                                设置
                        </h1>
                        <p  class="text-gray-500 mb-6">
                                修改DCS路径配置
                        </p>
                </div>

                <a-card >
                  <a-form layout="vertical">
                    <a-form-item label="DCS玩家文件" extra="请选择保存的游戏文件夹中的DCS文件夹，请勿选择游戏安装的目录。">
                      <div class="flex items-center gap-3">
                        <a-input
                          v-model:value="dcsPath"
                          placeholder="请输入或选择 DCS 安装路径"
                          class="flex-1"
                        />
                        <a-button type="primary" @click="handleSelectFolder">
                          <template #icon>
                            <folder-open-outlined />
                          </template>
                          选择文件夹
                        </a-button>
                      </div>
                    </a-form-item>

                    <a-form-item>
                      <a-space>
                        <a-button type="primary" @click="handleSubmit" :loading="loading">
                          保存
                        </a-button>
                        <a-button @click="dcsPath = ''">
                          重置
                        </a-button>
                      </a-space>
                    </a-form-item>
                  </a-form>
                </a-card>
        </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { FolderOpenOutlined } from '@ant-design/icons-vue'

// DCS 安装路径
const dcsPath = ref('')
const loading = ref(false)

// 组件挂载时加载已保存的设置
onMounted(async () => {
  try {
    if (window.windowApi?.getSettings) {
      const settings = await window.windowApi.getSettings()
      dcsPath.value = settings.dcsPath
    }
  } catch (error) {
    console.error('加载设置失败:', error)
  }
})

// 验证目录是否包含 Mods 文件夹
const validateModsFolder = async (folderPath: string): Promise<boolean> => {
  try {
    if (!folderPath) {
      message.warning('请选择有效的目录')
      return false
    }

    if (window.windowApi?.checkModsFolder) {
      const result = await window.windowApi.checkModsFolder(folderPath)
      if (!result.valid) {
        message.error(result.error || '未找到 Mods 文件夹')
        return false
      }
      return true
    } else {
      message.warning('此功能仅在 Electron 环境下可用')
      return false
    }
  } catch (error) {
    message.error('验证失败: ' + (error as Error).message)
    return false
  }
}

// 选择文件夹
const handleSelectFolder = async () => {
  try {
    // 检查是否在 Electron 环境中
    if (window.windowApi?.selectFolder) {
      const folderPath = await window.windowApi.selectFolder(
        '选择 DCS 安装目录',
        dcsPath.value
      )
      if (folderPath) {
        // 选择文件夹后立即验证是否包含 Mods 文件夹
        const isValid = await validateModsFolder(folderPath)
        if (isValid) {
          dcsPath.value = folderPath
        }
      }
    } else {
      message.warning('此功能仅在 Electron 环境下可用')
    }
  } catch (error) {
    message.error('选择文件夹失败: ' + (error as Error).message)
  }
}

// 提交表单
const handleSubmit = async () => {
  if (!dcsPath.value) {
    message.warning('请选择 DCS 安装路径')
    return
  }

  // 验证目录是否包含 Mods 文件夹
  const isValid = await validateModsFolder(dcsPath.value)
  if (!isValid) {
    return
  }

  loading.value = true
  try {
    if (window.windowApi?.saveSettings) {
      await window.windowApi.saveSettings({ dcsPath: dcsPath.value })
      message.success('保存成功')
    } else {
      message.warning('此功能仅在 Electron 环境下可用')
    }
  } catch (error) {
    message.error('保存失败: ' + (error as Error).message)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>

</style>