'use client'

import { useState, useEffect } from 'react'
import { Todo, TodoPriority } from '@/types/todo'
import { supabase } from '@/lib/supabase'  // ⭐ 导入 Supabase 客户端

export default function Home() {
  // ========== 状态管理 ==========
  const [todos, setTodos] = useState<Todo[]>([])      // 任务列表
  const [inputText, setInputText] = useState('')       // 输入框内容
  const [priority, setPriority] = useState<TodoPriority>('medium')  // 当前选择的优先级

  // ========== 组件初始化：从数据库加载数据 ==========
  useEffect(() => {
    fetchTodos()  // 页面加载时，从 Supabase 获取数据
  }, [])  // 空数组 = 只在组件首次挂载时执行一次

  // ========== 数据库操作函数 ==========

  /**
   * 📥 从数据库获取所有任务
   * 这是一个异步函数，会等待 Supabase 返回数据
   */
  const fetchTodos = async () => {
    // ⭐ 调用 Supabase API 查询数据
    const { data, error } = await supabase
      .from('todos')                           // 从 todos 表查询
      .select('*')
      .eq('delete_flag',false)                            
      .order('created_at', { ascending: false }) // 按创建时间倒序（最新的在前）

    // ⭐ 错误处理
    if (error) {
      console.error('❌ 获取任务失败:', error.message)
      alert('获取任务失败，请检查网络连接')
    } else {
      // ⭐ 成功：更新本地状态
      setTodos(data || [])  // data 可能是 null，所以用 || [] 做兜底
    }
  }

  /**
   * ➕ 添加新任务到数据库
   */
  const addTodo = async () => {
    // 验证输入不为空
    if (!inputText.trim()) return

    // ⭐ 插入数据到 Supabase
    const { data, error } = await supabase
      .from('todos')
      .insert([{                  // insert 接收一个数组
        text: inputText,
        completed: false,
        priority: priority,
        delete_flag: false,
        updated_at: new Date().toISOString()
        // 注意：id 和 created_at 会自动生成，不需要传
      }])
      .select()  // ⭐ 重要：添加 .select() 才能返回插入的数据

    if (error) {
      console.error('❌ 添加任务失败:', error.message)
      alert('添加失败，请重试')
    } else {
      // ⭐ 成功：将新任务添加到本地状态（避免重新请求数据库）
      setTodos([...data, ...todos])  // 新任务放在最前面
      setInputText('')  // 清空输入框
    }
  }

  /**
   * ✅ 切换任务的完成状态
   * @param id 任务的 UUID
   * @param currentCompleted 当前的完成状态
   */
  const toggleTodo = async (id: string, currentCompleted: boolean) => {
    // ⭐ 更新数据库中的 completed 字段
    const { error } = await supabase
      .from('todos')
      .update({ 
        completed: !currentCompleted, // 取反：true → false, false → true
        updated_at: new Date().toISOString()
      })  
      .eq('id', id)  // ⭐ 条件：只更新 id 匹配的那一行

    if (error) {
      console.error('❌ 更新任务失败:', error.message)
    } else {
      // ⭐ 成功：重新从数据库获取最新数据
      // 为什么重新获取？确保前端和数据库数据一致
      fetchTodos()
    }
  }

  /**
   * 🗑️ 从数据库删除任务
   * @param id 任务的 UUID
   */
  const deleteTodo = async (id: string) => {
    // ✅ 只标记为已删除，不真正删除
    const { error } = await supabase
      .from('todos')
      .update({                                 // ← 🆕 改用 update 而不是 delete
        delete_flag: true,                      // ← 🆕 标记为已删除
        updated_at: new Date().toISOString()    // ← 🆕 记录删除时间
      })
      .eq('id', id)

    if (error) {
      console.error('❌ 删除任务失败:', error.message)
    } else {
      // ⭐ 成功：重新获取数据
      fetchTodos()
    }
  }

  // 优先级图标映射
  const priorityIcons = {
    high: '🔴',
    medium: '🟡',
    low: '🟢'
  }

  // ========== 渲染 UI ==========
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center mb-8">
          📝 我的待办清单（Supabase 版）
        </h1>

        {/* 输入区域 */}
        <div className="flex gap-3 mb-6">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addTodo()}
            placeholder="输入新的待办事项..."
            className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl text-lg focus:border-blue-500 focus:outline-none"
          />

          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TodoPriority)}
            className="px-4 py-3 border-2 border-gray-300 rounded-xl text-lg focus:border-blue-500 focus:outline-none cursor-pointer"
          >
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
          </select>

          <button
            onClick={addTodo}
            className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
          >
            添加
          </button>
        </div>

        {/* 任务列表 */}
        <ul className="space-y-3">
          {todos.map((todo) => (  // ⭐ 注意：不再用 index，直接用 todo 对象
            <li
              key={todo.id}  // ⭐ 用数据库 ID 作为 key（React 要求唯一）
              className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                todo.completed
                  ? 'bg-green-50 opacity-70'
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <span
                onClick={() => toggleTodo(todo.id, todo.completed)}  // ⭐ 传入 id 和 completed
                className={`flex-1 cursor-pointer text-lg ${
                  todo.completed ? 'line-through text-gray-500' : ''
                }`}
              >
                {todo.completed ? '✅' : priorityIcons[todo.priority]} {todo.text}
              </span>

              <button
                onClick={() => deleteTodo(todo.id)}  // ⭐ 传入 id
                className="ml-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                删除
              </button>
            </li>
          ))}
        </ul>

        {/* 统计信息 */}
        <div className="mt-6 p-4 bg-green-50 rounded-xl text-center text-green-700">
          待完成：{todos.filter(t => !t.completed).length} |
          已完成：{todos.filter(t => t.completed).length}
        </div>
      </div>
    </div>
  )
}
