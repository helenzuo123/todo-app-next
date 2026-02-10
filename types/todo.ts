// types/todo.ts
// 定义任务优先级的联合类型
export type TodoPriority = 'low' | 'medium' | 'high'

// 定义任务对象的接口
// ⭐ 注意：这里的字段要和 Supabase 数据库表结构一致
export interface Todo {
  id: string              // 数据库自动生成的 UUID（必填）
  text: string            // 任务内容
  completed: boolean      // 是否完成
  priority: TodoPriority  // 优先级
  user_id?: string        // 用户 ID（可选，后续用于多用户）
  created_at: string      // 数据库自动生成的创建时间
}

// 定义统计信息的接口
export interface TodoStats {
  total: number        // 总数
  completed: number    // 已完成
  pending: number      // 待完成
}
