import { renderIcon, changeLocalMusicPath } from "@/utils/helper";
import { openAddRemoteFolder } from "@/utils/modal";
import type { DropdownOption } from "naive-ui";

/**
 * 文件夹操作 Composable
 * @param hooks 回调钩子
 */
export function useFolderActions(hooks?: {
  /** Google Drive 登录成功回调 */
  onDriveLoginSuccess?: () => void;
}) {
  // 添加文件夹下拉选项
  const addFolderOptions: DropdownOption[] = [
    { label: "选择本地文件夹", key: "local", icon: renderIcon("Folder") },
    { label: "添加SMB", key: "smb", icon: renderIcon("Link") },
    { label: "添加FTP", key: "ftp", icon: renderIcon("Link") },
    { label: "添加NFS", key: "nfs", icon: renderIcon("Link") },
    { label: "添加WebDAV", key: "webdav", icon: renderIcon("Cloud") },
    { type: "divider", key: "d1" },
    { label: "连接 Google Drive", key: "google-drive", icon: renderIcon("Cloud") },
  ];

  // 处理添加文件夹选择
  const handleAddFolderSelect = async (key: string) => {
    switch (key) {
      case "local":
        changeLocalMusicPath();
        break;
      case "smb":
        openAddRemoteFolder("smb");
        break;
      case "ftp":
        openAddRemoteFolder("ftp");
        break;
      case "nfs":
        openAddRemoteFolder("nfs");
        break;
      case "webdav":
        openAddRemoteFolder("webdav");
        break;
      case "google-drive":
        try {
          window.$message.info("正在打开 Google 授权页面...");
          const result = await window.api.googleDrive.login();
          if (result.status === "success") {
            window.$message.success(result.message || "Google Drive 连接成功！");
            // 触发回调
            hooks?.onDriveLoginSuccess?.();
          } else if (result.status === "pending") {
            window.$message.warning(result.message || "认证正在进行中");
          } else {
            window.$message.error(result.message || "连接失败");
          }
        } catch (error) {
          console.error("Google Drive 登录失败:", error);
          window.$message.error("Google Drive 连接失败");
        }
        break;
    }
  };

  return {
    addFolderOptions,
    handleAddFolderSelect,
  };
}
