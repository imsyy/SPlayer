/**
 * 本地音乐相关类型定义
 */

/** 远程文件夹协议类型 */
export type RemoteFolderType = "smb" | "nfs" | "webdav" | "ftp";

/** 远程文件夹配置 */
export interface RemoteFolderConfig {
  /** 唯一标识 */
  id: string;
  /** 协议类型 */
  type: RemoteFolderType;
  /** 显示名称 */
  name: string;
  /** 服务器地址 */
  host: string;
  /** 端口 */
  port?: number;
  /** 共享路径 */
  path: string;
  /** 用户名 */
  username?: string;
  /** 密码 */
  password?: string;
  /** 完整路径（用于实际访问） */
  fullPath: string;
  /** 是否启用 */
  enabled: boolean;
}
