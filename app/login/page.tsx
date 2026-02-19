'use client'

// ========== 导入依赖 ==========
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

/**
 * 🔐 登录页面组件
 *
 * 功能：
 * 1. 显示登录表单（邮箱 + 密码）
 * 2. 用户输入凭据后，调用 Supabase Auth API
 * 3. 登录成功后跳转到主页
 * 4. 登录失败显示错误信息
 */
export default function LoginPage() {
  // ========== 状态管理 ==========

  // 📧 用户输入的邮箱
  const [email, setEmail] = useState('')

  // 🔑 用户输入的密码
  const [password, setPassword] = useState('')

  // ⏳ 是否正在登录中（用于显示加载状态）
  const [loading, setLoading] = useState(false)

  // ❌ 错误信息（登录失败时显示）
  const [error, setError] = useState('')

  // 🧭 Next.js 路由对象（用于页面跳转）
  const router = useRouter()

  // ========== 核心功能：处理登录 ==========

  /**
   * 🚀 处理登录逻辑
   *
   * 前后端交互流程：
   * 1. 前端收集用户输入（邮箱、密码）
   * 2. 调用 Supabase Auth API
   * 3. Supabase 发送 HTTP 请求到服务器验证
   * 4. 服务器验证成功，返回 Token（身份令牌）
   * 5. Token 自动存储在浏览器（Cookie/LocalStorage）
   * 6. 前端跳转到主页
   */
  const handleLogin = async (e: React.FormEvent) => {
    // 阻止表单默认提交行为（默认会刷新页面）
    e.preventDefault()

    // 清空之前的错误信息
    setError('')

    // 设置加载状态（按钮显示"登录中..."）
    setLoading(true)

    // ⭐ 核心：调用 Supabase Auth API 登录
    // 💡 这个方法会：
    //    1. 发送 POST 请求到 Supabase 服务器
    //    2. 验证邮箱密码是否正确
    //    3. 返回用户信息和 Token
    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })

    // 关闭加载状态
    setLoading(false)

    // ❌ 登录失败的处理
    if (loginError) {
      console.error('登录失败:', loginError.message)

      // 根据错误类型显示友好的中文提示
      if (loginError.message.includes('Invalid login credentials')) {
        setError('邮箱或密码错误，请重试')
      } else if (loginError.message.includes('Email not confirmed')) {
        setError('邮箱未验证，请查收验证邮件')
      } else {
        setError('登录失败：' + loginError.message)
      }
      return
    }

    // ✅ 登录成功的处理
    if (data.user) {
      console.log('✅ 登录成功！用户信息:', data.user)

      // 💡 此时 Supabase 已经自动保存了 Token
      // Token 存储在：localStorage.getItem('supabase.auth.token')
      // 以后每次请求都会自动带上这个 Token

      // 跳转到主页
      router.push('/')
    }
  }

  // ========== 渲染 UI ==========
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        {/* 标题 */}
        <h1 className="text-3xl font-bold text-center mb-2">
          🔐 登录
        </h1>
        <p className="text-center text-gray-600 mb-8">
          登录到你的待办清单
        </p>

        {/* 登录表单 */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* 邮箱输入框 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📧 邮箱
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* 密码输入框 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🔑 密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入密码"
              required
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* 错误信息显示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
              ❌ {error}
            </div>
          )}

          {/* 登录按钮 */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-xl text-white font-medium transition-colors ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        {/* 注册链接 */}
        <div className="mt-6 text-center text-gray-600">
          还没有账号？
          <a href="/register" className="text-blue-500 hover:text-blue-600 ml-1">
            立即注册
          </a>
        </div>
      </div>
    </div>
  )
}
