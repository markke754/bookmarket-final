import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import NavBar from './NavBar.vue'
import { createPinia, setActivePinia } from 'pinia'

describe('NavBar', () => {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'home' },
      { path: '/login', name: 'login' },
      { path: '/register', name: 'register' },
      { path: '/buyer', name: 'buyer' },
      { path: '/seller', name: 'seller' },
      { path: '/about', name: 'about' }
    ]
  })

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders navigation links correctly', () => {
    const wrapper = mount(NavBar, {
      global: {
        plugins: [router]
      }
    })
    
    expect(wrapper.find('[data-test="nav-home"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="nav-login"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="nav-register"]').exists()).toBe(true)
  })

  it('shows buyer/seller links when user is logged in', async () => {
    const wrapper = mount(NavBar, {
      global: {
        plugins: [router]
      }
    })

    // 模拟用户登录状态
    const authStore = useAuthStore()
    authStore.isAuthenticated = true
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="nav-buyer"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="nav-seller"]').exists()).toBe(true)
  })

  it('triggers logout when logout button is clicked', async () => {
    const wrapper = mount(NavBar, {
      global: {
        plugins: [router]
      }
    })

    const authStore = useAuthStore()
    authStore.isAuthenticated = true
    const logoutSpy = vi.spyOn(authStore, 'logout')

    await wrapper.find('[data-test="logout-button"]').trigger('click')
    expect(logoutSpy).toHaveBeenCalled()
  })
})