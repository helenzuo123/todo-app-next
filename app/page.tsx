'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Todo, TodoPriority } from '@/types/todo'
import { supabase } from '@/lib/supabase'  // ⭐ 导入 Supabase 客户端
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { User, Search, X, ChevronLeft, ChevronRight, ClipboardList, Trash2, Pencil, CalendarIcon } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
  } from '@/components/ui/alert-dialog'

export default function Home() {
  // ========== 状态管理 ==========
  const [todos, setTodos] = useState<Todo[]>([])      // 任务列表
  const [priority, setPriority] = useState<TodoPriority>('medium')  // 当前选择的优先级
  const [userEmail, setUserEmail] = useState<string>('') // 👤 当前用户邮箱
  const [userId, setUserId] = useState<string>('')    // 🆔 当前用户ID
  const [loading, setLoading] = useState(true)        // ⏳ 加载状态
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString())  // 📅 当前选中的日期
  const [editingId, setEditingId] = useState<string>('')  // 🖊️ 正在编辑的任务 ID
  const [editingText, setEditingText] = useState('')      // 🖊️ 编辑中的文本
  const [editingPriority, setEditingPriority] = useState<TodoPriority>('medium')  // 🖊️ 编辑中的优先级
  const [deletingId, setDeletingId] = useState<string>('')
  const [searchText, setSearchText] = useState<string>('') // 🔍 搜索文本
  const [datesWithTodos, setDatesWithTodos] = useState<string[]>([]) // 📅 有任务的日期列表
  const composingRef = useRef(false) // 🎌 IME输入法合成状态
  const editInputRef = useRef<HTMLInputElement>(null) // 编辑输入框的 ref
  const addInputRef = useRef<HTMLInputElement>(null) // 添加输入框的 ref

  useEffect(() => {
    console.log('当前要删除的任务 ID:', deletingId)
  }, [deletingId])

  const router = useRouter()

  // ========== 拖拽配置 ==========
  // 配置拖拽传感器（鼠标移动5px后才开始拖拽，避免误触）
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  )

  // ========== 辅助函数：获取今天日期字符串（用于初始化状态） ==========
  function getTodayDateString(): string {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // ========== 日期处理函数 ==========

  /**
   * 📅 获取今天的日期字符串（格式：YYYY-MM-DD）
   * 用于数据库查询和存储
   */
  const getTodayDate = (): string => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')  // 月份从0开始，需要+1
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  /**
   * 📆 格式化日期显示（格式：2026年2月12日 星期三）
   * @param dateStr 日期字符串（格式：YYYY-MM-DD）
   */
  const formatDateDisplay = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00')  // 添加时间避免时区问题
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
    const weekday = weekdays[date.getDay()]

    return `${year}年${month}月${day}日 ${weekday}`
  }

  // ========== 数据库操作函数 ==========

  /**
   * 📥 从数据库获取所有任务
   * 这是一个异步函数，会等待 Supabase 返回数据
   * 使用 useCallback 避免闭包陷阱
   */
  const fetchTodos = useCallback(async () => {
    // ⭐ 使用 selectedDate 而不是固定的今天
    console.log('📥 查询日期:', selectedDate)

    // ⭐ 调用 Supabase API 查询数据
    const { data, error } = await supabase
      .from('todos')                           // 从 todos 表查询
      .select('*')
      .eq('delete_flag', false)                // 只查询未删除的任务
      .eq('task_date', selectedDate)           // ⭐ 查询选中日期的任务
      .eq('user_id', userId)                   // 🔒 关键：只查询当前用户的任务
      .order('sort_order', { ascending: true, nullsFirst: false })  // 🆕 优先按 sort_order 排序
      .order('created_at', { ascending: false }) // 其次按创建时间倒序

    // ⭐ 错误处理
    if (error) {
      console.error('❌ 获取任务失败:', error.message)
      toast.error('获取任务失败', {
        description: '请检查网络连接',
      })
    } else {
      // ⭐ 成功：更新本地状态
      console.log('✅ 查询到任务数:', data?.length || 0)
      setTodos(data || [])  // data 可能是 null，所以用 || [] 做兜底
    }
  }, [selectedDate])  // ⭐ 依赖 selectedDate，当日期改变时重新创建函数

  /**
   * 📅 获取所有有任务的日期
   * 用于在日历上标记有任务的日期
   */
  const fetchDatesWithTodos = useCallback(async () => {
    if (!userId) return

    const { data, error } = await supabase
      .from('todos')
      .select('task_date')
      .eq('delete_flag', false)
      .eq('user_id', userId)

    if (error) {
      console.error('❌ 获取任务日期失败:', error.message)
    } else {
      // 提取唯一的日期
      const uniqueDates = [...new Set(data.map(item => item.task_date))]
      setDatesWithTodos(uniqueDates)
    }
  }, [userId])

  /**
   * 🔍 搜索过滤逻辑
   * 根据搜索文本过滤任务列表（前端过滤）
   */
  const filteredTodos = searchText.trim() === ''
    ? todos  // 没有搜索文本时，显示所有任务
    : todos.filter(todo =>
        todo.text.toLowerCase().includes(searchText.toLowerCase())  // 不区分大小写的模糊搜索
      )

  /**
   * 🔍 清除搜索
   */
  const clearSearch = () => {
    setSearchText('')
  }

  /**
   * ➕ 添加新任务到数据库
   */
  const addTodo = async () => {
    // 从 ref 读取真实的 DOM 值
    const actualText = addInputRef.current?.value || ''

    // 验证输入不为空
    if (!actualText.trim()) return

    // ⭐ 插入数据到 Supabase
    const { data, error } = await supabase
      .from('todos')
      .insert([{                  // insert 接收一个数组
        text: actualText,
        completed: false,
        priority: priority,
        delete_flag: false,
        updated_at: new Date().toISOString(),
        task_date: selectedDate,  // ⭐ 使用选中的日期
        user_id: userId           // ⭐ 关联当前登录用户ID
        // 注意：id 和 created_at 会自动生成，不需要传
      }])
      .select()  // ⭐ 重要：添加 .select() 才能返回插入的数据

    if (error) {
      console.error('❌ 添加任务失败:', error.message)
      toast.error('添加失败', {
        description: '请重试',
      })
    } else {
      // ⭐ 成功：将新任务添加到本地状态（避免重新请求数据库）
      setTodos([...data, ...todos])  // 新任务放在最前面
      // 清空输入框
      if (addInputRef.current) {
        addInputRef.current.value = ''
      }
      // 🔄 更新日历上的日期标记
      fetchDatesWithTodos()
    }
  }

  /**
   * ✅ 切换任务的完成状态（使用乐观更新）
   * @param id 任务的 UUID
   * @param currentCompleted 当前的完成状态
   */
  const toggleTodo = async (id: string, currentCompleted: boolean) => {
    // 🚀 乐观更新：立即更新本地状态，无需等待数据库响应
    const newCompleted = !currentCompleted
    setTodos(prevTodos =>
      prevTodos.map(todo =>
        todo.id === id
          ? { ...todo, completed: newCompleted, updated_at: new Date().toISOString() }
          : todo
      )
    )

    // ⭐ 在后台更新数据库
    const { error } = await supabase
      .from('todos')
      .update({
        completed: newCompleted,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId)  // 🔒 确保只能修改自己的任务

    if (error) {
      console.error('❌ 更新任务失败:', error.message)
      // 🔄 失败时回滚：恢复原来的状态
      setTodos(prevTodos =>
        prevTodos.map(todo =>
          todo.id === id
            ? { ...todo, completed: currentCompleted }
            : todo
        )
      )
      toast.error('更新失败', {
        description: '请重试',
      })
    }
  }

  /**
   * ✏️ 更新任务文本
   * @param id 任务的 UUID
   * @param newText 新的任务文本
   */
  const updateTodo = async (id: string, newText: string, newPriority: TodoPriority) => {
    // 验证输入不为空
    if (!newText.trim()) {
      toast.warning('任务内容不能为空')
      return
    }

    // ⭐ 更新数据库中的 text 和 priority 字段
    const { error } = await supabase
      .from('todos')
      .update({
        text: newText,
        priority: newPriority,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId)  // 🔒 确保只能修改自己的任务

    if (error) {
      console.error('❌ 更新任务失败:', error.message)
      toast.error('更新失败', {
        description: '请重试',
      })
    } else {
      // ⭐ 成功：清除编辑状态，重新获取数据
      setEditingId('')
      setEditingText('')
      setEditingPriority('medium')
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
      .eq('user_id', userId)  // 🔒 确保只能删除自己的任务

    if (error) {
      console.error('❌ 删除任务失败:', error.message)
    } else {
      // ⭐ 成功：重新获取数据
      fetchTodos()
      // 🔄 更新日历上的日期标记
      fetchDatesWithTodos()
    }
  }

  /**
   * 🔄 处理拖拽结束事件
   * @param event 拖拽事件对象
   */
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    // 如果拖拽到无效位置，不处理
    if (!over || active.id === over.id) {
      return
    }

    // 找到拖拽项的索引
    const oldIndex = todos.findIndex((todo) => todo.id === active.id)
    const newIndex = todos.findIndex((todo) => todo.id === over.id)

    // 使用 arrayMove 计算新顺序
    const reorderedTodos = arrayMove(todos, oldIndex, newIndex)

    // 立即更新UI（乐观更新）
    setTodos(reorderedTodos)

    // 批量更新数据库 sort_order
    try {
      // 为每个任务设置新的 sort_order（从0开始）
      const updates = reorderedTodos.map((todo, index) => ({
        id: todo.id,
        sort_order: index,
        updated_at: new Date().toISOString(),
      }))

      // 批量更新（使用 Promise.all 并发执行）
      await Promise.all(
        updates.map((update) =>
          supabase
            .from('todos')
            .update({ sort_order: update.sort_order, updated_at: update.updated_at })
            .eq('id', update.id)
            .eq('user_id', userId)  // 🔒 确保只能更新自己的任务
        )
      )

      console.log('✅ 排序更新成功')
    } catch (error) {
      console.error('❌ 排序更新失败:', error)
      // 如果更新失败，重新获取数据恢复原状态
      fetchTodos()
    }
  }

  // ========== 认证相关函数 ==========

  /**
   * 📅 日期切换函数：切换到上一天
   * 注意：避免使用 toISOString() 导致的时区问题
   */
  const goToPreviousDay = () => {
    const date = new Date(selectedDate + 'T12:00:00')  // 使用中午12点避免时区边界问题
    date.setDate(date.getDate() - 1)  // 减一天
    // 手动拼接日期字符串，避免时区转换
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    setSelectedDate(`${year}-${month}-${day}`)
  }

  /**
   * 📅 日期切换函数：切换到下一天
   * 注意：避免使用 toISOString() 导致的时区问题
   */
  const goToNextDay = () => {
    const date = new Date(selectedDate + 'T12:00:00')  // 使用中午12点避免时区边界问题
    date.setDate(date.getDate() + 1)  // 加一天
    // 手动拼接日期字符串，避免时区转换
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    setSelectedDate(`${year}-${month}-${day}`)
  }

  /**
   * 🔐 检查用户登录状态
   *
   * 前后端交互流程：
   * 1. 调用 Supabase 获取当前会话（Session）
   * 2. Session 包含用户信息和 Token
   * 3. 如果有 Session，说明已登录
   * 4. 如果没有 Session，跳转到登录页
   */
  const checkUser = async () => {
    // ⭐ 获取当前用户的会话（Session）
    // 💡 Supabase 会从 localStorage 读取之前登录时保存的 Token
    const { data: { session } } = await supabase.auth.getSession()

    // ❌ 未登录：跳转到登录页
    if (!session) {
      console.log('未登录，跳转到登录页')
      router.push('/login')
      return
    }

    // ✅ 已登录：保存用户信息
    console.log('✅ 当前用户:', session.user)
    setUserEmail(session.user.email || '')
    setUserId(session.user.id)  // ⭐ 保存用户ID（会触发 useEffect 加载任务）
    setLoading(false)
    // ⭐ 不在这里调用 fetchTodos，让 useEffect 统一管理
  }

  /**
   * 🚪 退出功能
   *
   * 前后端交互流程：
   * 1. 调用 Supabase 退出 API
   * 2. Supabase 清除 localStorage 中的 Token
   * 3. 跳转到登录页
   */
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('退出失败:', error.message)
      toast.error('退出失败', {
        description: '请重试',
      })
    } else {
      console.log('✅ 退出成功')
      router.push('/login')
    }
  }

  // ========== 组件初始化：检查登录状态并加载数据 ==========
  useEffect(() => {
    checkUser()  // 检查用户登录状态
  }, [])  // 空数组 = 只在组件首次挂载时执行一次

  // ========== 监听日期变化：当选中日期改变时重新加载任务 ==========
  useEffect(() => {
    if (userId) {  // 只有登录后才查询
      fetchTodos()
    }
  }, [selectedDate, userId, fetchTodos])  // ⭐ 完整的依赖数组

  // ========== 获取所有有任务的日期（用于日历标记） ==========
  useEffect(() => {
    if (userId) {
      fetchDatesWithTodos()
    }
  }, [userId, fetchDatesWithTodos])

  // 💡 如果正在加载，显示加载状态
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">加载中...</div>
      </div>
    )
  }

  // 优先级配置 - 使用现代配色
  const priorityConfig = {
    high: { label: '高', color: 'bg-red-100 text-red-700 border-red-200', icon: '🔴' },
    medium: { label: '中', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: '🟡' },
    low: { label: '低', color: 'bg-green-100 text-green-700 border-green-200', icon: '🟢' }
  }

  // ========== 可拖拽的任务项组件 ==========
  interface SortableTaskItemProps {
    todo: Todo
    onToggle: (id: string, completed: boolean) => void
    onDelete: (id: string) => void
    isEditing: boolean
    editingText: string
    editingPriority: TodoPriority
    onEdit: (id: string, text: string, priority: TodoPriority) => void
    onSave: (id: string, text: string, priority: TodoPriority) => void
    onCancel: () => void
    onEditTextChange: (text: string) => void
    onEditPriorityChange: (priority: TodoPriority) => void
    onDeleteClick: (id: string) => void
  }

  const SortableTaskItem = ({
    todo,
    onToggle,
    onDelete,
    isEditing,
    editingText,
    editingPriority,
    onEdit,
    onSave,
    onCancel,
    onEditTextChange,
    onEditPriorityChange,
    onDeleteClick,
  }: SortableTaskItemProps) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: todo.id })

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    }

    // 🖊️ 编辑模式：显示输入框和保存/取消按钮
    if (isEditing) {
      return (
        <Card
          ref={setNodeRef}
          style={style}
          className="border border-blue-400 shadow-xl bg-white ring-2 ring-blue-400/30"
        >
          <CardContent className="flex items-center gap-3 py-2.5 px-4">
            <Input
              ref={editInputRef}
              type="text"
              defaultValue={editingText}
              onCompositionStart={() => {
                composingRef.current = true
              }}
              onCompositionEnd={() => {
                composingRef.current = false
              }}
              onKeyDown={(e) => {
                // 只在非合成状态下响应 Enter
                if (e.key === 'Enter' && !composingRef.current) {
                  e.preventDefault()
                  // 从 ref 读取真实的 DOM 值
                  const actualValue = editInputRef.current?.value || ''
                  onSave(todo.id, actualValue, editingPriority)
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  onCancel()
                }
              }}
              className="flex-1 h-8 text-[15px] bg-gray-50 border-gray-300 focus:border-blue-400 focus:bg-white"
              autoFocus
            />
            <Select
              value={editingPriority}
              onValueChange={(value: TodoPriority) => {
                // 修改优先级时，同步读取输入框的值并更新 state
                const currentValue = editInputRef.current?.value || editingText
                onEditTextChange(currentValue)
                onEditPriorityChange(value)
              }}
            >
              <SelectTrigger className="w-20 h-8 text-xs bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">🟢 低</SelectItem>
                <SelectItem value="medium">🟡 中</SelectItem>
                <SelectItem value="high">🔴 高</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => {
                // 从 ref 读取真实的 DOM 值
                const actualValue = editInputRef.current?.value || editingText
                onSave(todo.id, actualValue, editingPriority)
              }}
              size="sm"
              className="h-8 px-4 text-sm font-medium bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
            >
              保存
            </Button>
            <Button
              onClick={onCancel}
              variant="outline"
              size="sm"
              className="h-8 px-4 text-sm font-medium"
            >
              取消
            </Button>
          </CardContent>
        </Card>
      )
    }

    // 📝 正常模式：显示复选框、任务内容、修改和删除按钮
    return (
      <Card
        ref={setNodeRef}
        style={style}
        className={`transition-all duration-200 border border-gray-200 ${
          todo.completed
            ? 'bg-gradient-to-r from-gray-50 to-gray-100 opacity-75'
            : 'bg-white hover:shadow-lg hover:border-blue-300'
        } ${isDragging ? 'cursor-grabbing shadow-2xl scale-105 rotate-2' : 'cursor-grab shadow-md'}`}
        {...attributes}
        {...listeners}
      >
        <CardContent className="flex items-start gap-3 py-2 px-4">
          {/* 复选框 */}
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={(e) => {
              e.stopPropagation() // 阻止冒泡到拖拽事件
              onToggle(todo.id, todo.completed)
            }}
            className="w-4 h-4 mt-0.5 cursor-pointer accent-blue-600 rounded border-2 border-gray-400 hover:border-blue-500 transition-colors flex-shrink-0"
          />

          {/* 优先级 Badge - 可点击 */}
          <span
            onClick={(e) => {
              e.stopPropagation()
              onToggle(todo.id, todo.completed)
            }}
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold border shadow-sm flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity ${priorityConfig[todo.priority].color}`}
          >
            {priorityConfig[todo.priority].icon}
          </span>

          {/* 任务文本 - 可点击 */}
          <span
            onClick={(e) => {
              e.stopPropagation()
              onToggle(todo.id, todo.completed)
            }}
            className={`flex-1 text-[15px] leading-relaxed cursor-pointer ${
              todo.completed ? 'line-through text-gray-400' : 'text-gray-800'
            }`}
          >
            {todo.text}
          </span>

          {/* 按钮容器 */}
          <div className="flex gap-2 flex-shrink-0">
            {/* 修改按钮 */}
            <Button
              onClick={(e) => {
                e.stopPropagation() // 阻止冒泡到拖拽事件
                onEdit(todo.id, todo.text, todo.priority)
              }}
              disabled={todo.completed}  // 已完成任务不可编辑
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-30"
              title="修改任务"
            >
              <Pencil className="h-4 w-4" />
            </Button>

            {/* 删除按钮 */}
            <Button
              onClick={(e) => {
                e.stopPropagation() // 阻止冒泡到拖拽事件
                onDeleteClick(todo.id)
              }}
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="删除任务"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ========== 渲染 UI ==========
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
      <div className="max-w-2xl mx-auto bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8">
        {/* 顶栏：标题 + 日期切换 + 用户头像 */}
        <div className="flex items-center justify-between mb-6">
          {/* 左侧：标题 */}
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ClipboardList className="w-8 h-8 text-blue-600" />
            我的待办清单
          </h1>

          {/* 右侧：日期切换 + 用户头像 */}
          <div className="flex items-center gap-3">
            {/* 日期切换区域 */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPreviousDay}
                title="上一天"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="px-3 py-1.5 h-9 text-sm font-normal hover:bg-blue-50 hover:border-blue-400 transition-colors"
                  >
                    <span className="mr-2">{format(new Date(selectedDate + 'T00:00:00'), 'yyyy/MM/dd', { locale: zhCN })}</span>
                    <CalendarIcon className="h-4 w-4 text-gray-500" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <Calendar
                    mode="single"
                    selected={new Date(selectedDate + 'T00:00:00')}
                    onSelect={(date) => {
                      if (date) {
                        const year = date.getFullYear()
                        const month = String(date.getMonth() + 1).padStart(2, '0')
                        const day = String(date.getDate()).padStart(2, '0')
                        setSelectedDate(`${year}-${month}-${day}`)
                      }
                    }}
                    modifiers={{
                      hasTodos: (date) => {
                        const dateStr = format(date, 'yyyy-MM-dd')
                        return datesWithTodos.includes(dateStr)
                      }
                    }}
                    modifiersClassNames={{
                      hasTodos: 'relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-blue-500 after:rounded-full'
                    }}
                    locale={zhCN}
                  />
                </PopoverContent>
              </Popover>

              <Button
                variant="ghost"
                size="icon"
                onClick={goToNextDay}
                title="下一天"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* 用户头像下拉菜单 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="focus:outline-none">
                  <Avatar size="default" className="cursor-pointer hover:opacity-80 transition-opacity">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                      <User className="w-5 h-5" />
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>我的账号</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 text-sm text-gray-600">
                  {userEmail}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={handleLogout}
                  className="cursor-pointer"
                >
                  🚪 退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* 日期显示 + 搜索 */}
        <div className="mb-6 pb-4 border-b border-gray-200 flex items-center justify-between">
          <div className="text-gray-600 text-base">
            {formatDateDisplay(selectedDate)}
          </div>

          {/* 搜索框 */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="搜索任务..."
              className="pl-9 pr-8 py-2 text-sm"
            />
            {searchText && (
              <button
                onClick={clearSearch}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 输入区域 */}
        <div className="flex gap-3 mb-4">
          <Input
            ref={addInputRef}
            type="text"
            defaultValue=""
            onCompositionStart={() => {
              composingRef.current = true
            }}
            onCompositionEnd={() => {
              composingRef.current = false
            }}
            onKeyDown={(e) => {
              // 只在非合成状态下响应 Enter
              if (e.key === 'Enter' && !composingRef.current) {
                e.preventDefault()
                addTodo()
              }
            }}
            placeholder="输入新的待办事项..."
            className="flex-1"
          />

          <Select value={priority} onValueChange={(value: TodoPriority) => setPriority(value)}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">🟢 低</SelectItem>
              <SelectItem value="medium">🟡 中</SelectItem>
              <SelectItem value="high">🔴 高</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={addTodo} className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
            添加
          </Button>
        </div>

        {/* 任务列表 - 支持拖拽排序 */}
        <Card className="border border-blue-100/50 bg-gradient-to-br from-blue-50/80 via-purple-50/60 to-indigo-50/80 backdrop-blur-sm shadow-lg">
          <CardContent className="p-5">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={filteredTodos.map((todo) => todo.id)}
                strategy={verticalListSortingStrategy}
              >
                {filteredTodos.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-sm">
                    {searchText ? '未找到匹配的任务' : '暂无任务'}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredTodos.map((todo) => (
                      <SortableTaskItem
                        key={todo.id}
                        todo={todo}
                        onToggle={toggleTodo}
                        onDelete={deleteTodo}
                        isEditing={editingId === todo.id}
                        editingText={editingText}
                        editingPriority={editingPriority}
                        onEdit={(id, text, priority) => {
                          setEditingId(id)
                          setEditingText(text)
                          setEditingPriority(priority)
                        }}
                        onSave={updateTodo}
                        onCancel={() => {
                          setEditingId('')
                          setEditingText('')
                          setEditingPriority('medium')
                        }}
                        onEditTextChange={setEditingText}
                        onEditPriorityChange={setEditingPriority}
                        onDeleteClick={setDeletingId}
                      />
                    ))}
                  </div>
                )}
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>

        {/* 统计信息 */}
        <div className="mt-4 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-50 to-green-50 border border-green-200 shadow-sm">
          <div className="text-center text-green-700 text-sm font-medium">
            待完成：{todos.filter(t => !t.completed).length} | 已完成：{todos.filter(t => t.completed).length}
          </div>
        </div>

        <AlertDialog
          open={deletingId!==''}
          onOpenChange={(isOpen) => {
          if (!isOpen){
            setDeletingId('')
          }
        }}
        >
          <AlertDialogContent className="max-w-sm">
            <AlertDialogHeader>
              <AlertDialogTitle>确定删除？</AlertDialogTitle>
              <AlertDialogDescription>
                确定要删除这个任务吗？此操作无法撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel asChild>
                <Button variant="outline" onClick={() => setDeletingId('')}>
                  取消
                </Button>
              </AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                  onClick={() =>{
                    deleteTodo(deletingId)
                    setDeletingId('')
                  }}
                >
                  确定删除
                </Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
