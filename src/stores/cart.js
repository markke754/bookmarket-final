import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import axios from 'axios';

export const useCartStore = defineStore('cart', () => {
  // 从本地存储加载购物车数据
  const loadCartFromStorage = () => {
    const savedCart = localStorage.getItem('cart');
    return savedCart ? JSON.parse(savedCart) : [];
  };

  const items = ref(loadCartFromStorage());
  
  // 监听购物车变化并保存到本地存储
  watch(items, (newItems) => {
    localStorage.setItem('cart', JSON.stringify(newItems));
  }, { deep: true });

  // 添加商品到购物车
  function addItem(item) {
    const existingItemIndex = items.value.findIndex(
      (cartItem) => cartItem.id === item.id
    );

    if (existingItemIndex !== -1) {
      // 如果商品已存在，增加数量
      items.value[existingItemIndex].quantity += 1;
    } else {
      // 否则添加新商品
      items.value.push({
        ...item,
        quantity: 1
      });
    }
  }

  // 从购物车移除商品
  function removeItem(index) {
    items.value.splice(index, 1);
  }

  // 更新商品数量
  function updateQuantity(index, quantity) {
    if (index >= 0 && index < items.value.length) {
      items.value[index].quantity = quantity;
    }
  }

  // 清空购物车
  function clearCart() {
    items.value = [];
  }

  // 获取购物车中的商品总数
  const totalItems = () => {
    return items.value.reduce((sum, item) => sum + item.quantity, 0);
  };

  // 获取购物车中的商品总价
  const totalPrice = () => {
    return items.value.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2);
  };
  
  // 验证购物车中的图书是否存在
  async function validateItems() {
    if (items.value.length === 0) return;
    
    try {
      // 过滤掉没有有效ID的图书
      const itemsWithValidIds = items.value.filter(item => item.id);
      
      // 如果发现有无效ID的图书，从购物车中移除
      if (itemsWithValidIds.length < items.value.length) {
        console.warn('购物车中存在无效图书ID，已自动移除');
        items.value = itemsWithValidIds;
        return {
          valid: false,
          removedCount: items.value.length - itemsWithValidIds.length
        };
      }
      
      // 如果没有图书有效ID，则不需要验证
      if (itemsWithValidIds.length === 0) {
        return { valid: true };
      }
      
      const bookIds = itemsWithValidIds.map(item => item.id);
      const apiUrl = import.meta.env.VITE_API_URL;
      
      const response = await axios.post(`${apiUrl}/api/books/validate`, {
        bookIds: bookIds
      });
      
      if (response.data.invalidBooks && response.data.invalidBooks.length > 0) {
        // 找出不存在的图书
        const invalidIds = response.data.invalidBooks;
        
        // 移除不存在的图书
        items.value = items.value.filter(item => !invalidIds.includes(item.id));
        
        return {
          valid: false,
          removedCount: invalidIds.length
        };
      }
      
      return { valid: true };
    } catch (error) {
      console.error('验证购物车图书失败:', error);
      return { valid: true }; // 错误时默认为有效，避免误删除
    }
  }

  return {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    totalItems,
    totalPrice,
    validateItems
  };
}); 