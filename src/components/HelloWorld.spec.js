import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import HelloWorld from './HelloWorld.vue'

describe('HelloWorld', () => {
  it('renders properly', () => {
    const wrapper = mount(HelloWorld, {
      props: {
        msg: 'Hello Vitest'
      }
    })
    expect(wrapper.text()).toContain('Hello Vitest')
  })

  it('increments count when button is clicked', async () => {
    const wrapper = mount(HelloWorld)
    const button = wrapper.find('button')
    const initialCount = wrapper.text().match(/count is (\d+)/)[1]
    
    await button.trigger('click')
    
    const newCount = wrapper.text().match(/count is (\d+)/)[1]
    expect(Number(newCount)).toBe(Number(initialCount) + 1)
  })

  it('contains documentation links', () => {
    const wrapper = mount(HelloWorld, {
      props: {
        msg: 'Test Message'
      }
    })
    
    const links = wrapper.findAll('a')
    expect(links.length).toBeGreaterThan(0)
    expect(links[0].attributes('href')).toContain('vuejs.org')
  })
})