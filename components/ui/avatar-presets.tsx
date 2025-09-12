import React from 'react'

// Avatar presets and definitions for user profile selection
export interface AvatarPreset {
  id: string
  name: string
  category: 'animals' | 'shapes' | 'nature' | 'professional' | 'abstract'
  component: React.ReactNode
}

// Simple SVG-based avatars that match the brown/cream theme
export const avatarPresets: AvatarPreset[] = [
  // Animals
  {
    id: 'cat',
    name: 'Cat',
    category: 'animals',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-amber-400 to-brown-500 flex items-center justify-center rounded-full">
        <span className="text-2xl">🐱</span>
      </div>
    )
  },
  {
    id: 'dog',
    name: 'Dog',
    category: 'animals',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-orange-400 to-brown-500 flex items-center justify-center rounded-full">
        <span className="text-2xl">🐶</span>
      </div>
    )
  },
  {
    id: 'bear',
    name: 'Bear',
    category: 'animals',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-brown-400 to-brown-600 flex items-center justify-center rounded-full">
        <span className="text-2xl">🐻</span>
      </div>
    )
  },
  {
    id: 'fox',
    name: 'Fox',
    category: 'animals',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center rounded-full">
        <span className="text-2xl">🦊</span>
      </div>
    )
  },
  {
    id: 'owl',
    name: 'Owl',
    category: 'animals',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-amber-400 to-brown-500 flex items-center justify-center rounded-full">
        <span className="text-2xl">🦉</span>
      </div>
    )
  },
  {
    id: 'rabbit',
    name: 'Rabbit',
    category: 'animals',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-pink-300 to-brown-400 flex items-center justify-center rounded-full">
        <span className="text-2xl">🐰</span>
      </div>
    )
  },

  // Nature
  {
    id: 'tree',
    name: 'Tree',
    category: 'nature',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-green-400 to-brown-500 flex items-center justify-center rounded-full">
        <span className="text-2xl">🌳</span>
      </div>
    )
  },
  {
    id: 'mountain',
    name: 'Mountain',
    category: 'nature',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-gray-400 to-brown-500 flex items-center justify-center rounded-full">
        <span className="text-2xl">🏔️</span>
      </div>
    )
  },
  {
    id: 'sun',
    name: 'Sun',
    category: 'nature',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center rounded-full">
        <span className="text-2xl">☀️</span>
      </div>
    )
  },
  {
    id: 'leaf',
    name: 'Leaf',
    category: 'nature',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center rounded-full">
        <span className="text-2xl">🍃</span>
      </div>
    )
  },

  // Professional
  {
    id: 'briefcase',
    name: 'Briefcase',
    category: 'professional',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-brown-400 to-brown-600 flex items-center justify-center rounded-full">
        <span className="text-2xl">💼</span>
      </div>
    )
  },
  {
    id: 'laptop',
    name: 'Laptop',
    category: 'professional',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-gray-400 to-brown-500 flex items-center justify-center rounded-full">
        <span className="text-2xl">💻</span>
      </div>
    )
  },
  {
    id: 'coffee',
    name: 'Coffee',
    category: 'professional',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-brown-400 to-brown-600 flex items-center justify-center rounded-full">
        <span className="text-2xl">☕</span>
      </div>
    )
  },

  // Abstract shapes
  {
    id: 'circle-pattern',
    name: 'Circle Pattern',
    category: 'abstract',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center rounded-full">
        <div className="w-4 h-4 bg-white rounded-full opacity-60"></div>
      </div>
    )
  },
  {
    id: 'diamond',
    name: 'Diamond',
    category: 'abstract',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center rounded-full">
        <div className="w-4 h-4 bg-white transform rotate-45 opacity-60"></div>
      </div>
    )
  },
  {
    id: 'triangle',
    name: 'Triangle',
    category: 'abstract',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center rounded-full">
        <div className="w-0 h-0 border-l-2 border-r-2 border-b-4 border-l-transparent border-r-transparent border-b-white opacity-60"></div>
      </div>
    )
  },

  // More Animals
  {
    id: 'panda',
    name: 'Panda',
    category: 'animals',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-600 flex items-center justify-center rounded-full">
        <span className="text-2xl">🐼</span>
      </div>
    )
  },
  {
    id: 'lion',
    name: 'Lion',
    category: 'animals',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center rounded-full">
        <span className="text-2xl">🦁</span>
      </div>
    )
  },
  {
    id: 'elephant',
    name: 'Elephant',
    category: 'animals',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center rounded-full">
        <span className="text-2xl">🐘</span>
      </div>
    )
  },
  {
    id: 'turtle',
    name: 'Turtle',
    category: 'animals',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center rounded-full">
        <span className="text-2xl">🐢</span>
      </div>
    )
  },
  {
    id: 'butterfly',
    name: 'Butterfly',
    category: 'animals',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-pink-300 to-purple-400 flex items-center justify-center rounded-full">
        <span className="text-2xl">🦋</span>
      </div>
    )
  },
  {
    id: 'bee',
    name: 'Bee',
    category: 'animals',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-yellow-300 to-amber-500 flex items-center justify-center rounded-full">
        <span className="text-2xl">🐝</span>
      </div>
    )
  },
  {
    id: 'penguin',
    name: 'Penguin',
    category: 'animals',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-gray-700 to-black flex items-center justify-center rounded-full">
        <span className="text-2xl">🐧</span>
      </div>
    )
  },

  // More Nature
  {
    id: 'flower',
    name: 'Flower',
    category: 'nature',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-pink-300 to-pink-500 flex items-center justify-center rounded-full">
        <span className="text-2xl">🌸</span>
      </div>
    )
  },
  {
    id: 'cactus',
    name: 'Cactus',
    category: 'nature',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center rounded-full">
        <span className="text-2xl">🌵</span>
      </div>
    )
  },
  {
    id: 'rainbow',
    name: 'Rainbow',
    category: 'nature',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-red-400 via-yellow-400 via-green-400 via-blue-400 to-purple-400 flex items-center justify-center rounded-full">
        <span className="text-2xl">🌈</span>
      </div>
    )
  },
  {
    id: 'star',
    name: 'Star',
    category: 'nature',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-yellow-300 to-yellow-500 flex items-center justify-center rounded-full">
        <span className="text-2xl">⭐</span>
      </div>
    )
  },
  {
    id: 'moon',
    name: 'Moon',
    category: 'nature',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-blue-300 to-indigo-500 flex items-center justify-center rounded-full">
        <span className="text-2xl">🌙</span>
      </div>
    )
  },
  {
    id: 'snowflake',
    name: 'Snowflake',
    category: 'nature',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-300 flex items-center justify-center rounded-full">
        <span className="text-2xl">❄️</span>
      </div>
    )
  },

  // More Professional
  {
    id: 'chart',
    name: 'Chart',
    category: 'professional',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center rounded-full">
        <span className="text-2xl">📊</span>
      </div>
    )
  },
  {
    id: 'gear',
    name: 'Gear',
    category: 'professional',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center rounded-full">
        <span className="text-2xl">⚙️</span>
      </div>
    )
  },
  {
    id: 'lightbulb',
    name: 'Light Bulb',
    category: 'professional',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center rounded-full">
        <span className="text-2xl">💡</span>
      </div>
    )
  },
  {
    id: 'target',
    name: 'Target',
    category: 'professional',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center rounded-full">
        <span className="text-2xl">🎯</span>
      </div>
    )
  },
  {
    id: 'trophy',
    name: 'Trophy',
    category: 'professional',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center rounded-full">
        <span className="text-2xl">🏆</span>
      </div>
    )
  },
  {
    id: 'rocket',
    name: 'Rocket',
    category: 'professional',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center rounded-full">
        <span className="text-2xl">🚀</span>
      </div>
    )
  },

  // Food & Fun
  {
    id: 'pizza',
    name: 'Pizza',
    category: 'abstract',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-red-400 to-orange-500 flex items-center justify-center rounded-full">
        <span className="text-2xl">🍕</span>
      </div>
    )
  },
  {
    id: 'donut',
    name: 'Donut',
    category: 'abstract',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-pink-400 to-brown-500 flex items-center justify-center rounded-full">
        <span className="text-2xl">🍩</span>
      </div>
    )
  },
  {
    id: 'cupcake',
    name: 'Cupcake',
    category: 'abstract',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-pink-300 to-pink-500 flex items-center justify-center rounded-full">
        <span className="text-2xl">🧁</span>
      </div>
    )
  },
  {
    id: 'music',
    name: 'Music Note',
    category: 'abstract',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center rounded-full">
        <span className="text-2xl">🎵</span>
      </div>
    )
  },
  {
    id: 'camera-icon',
    name: 'Camera',
    category: 'professional',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center rounded-full">
        <span className="text-2xl">📷</span>
      </div>
    )
  },

  // Shapes with theme colors
  {
    id: 'amber-gradient',
    name: 'Amber Gradient',
    category: 'shapes',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-amber-300 via-amber-400 to-brown-500 rounded-full"></div>
    )
  },
  {
    id: 'brown-gradient',
    name: 'Brown Gradient',
    category: 'shapes',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-brown-300 via-brown-500 to-brown-700 rounded-full"></div>
    )
  },
  {
    id: 'cream-gradient',
    name: 'Cream Gradient',
    category: 'shapes',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-cream-200 via-amber-200 to-brown-300 rounded-full"></div>
    )
  },
  {
    id: 'warm-gradient',
    name: 'Warm Gradient',
    category: 'shapes',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-orange-300 via-amber-400 to-brown-500 rounded-full"></div>
    )
  },
  {
    id: 'cool-gradient',
    name: 'Cool Gradient',
    category: 'shapes',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-blue-300 via-indigo-400 to-purple-500 rounded-full"></div>
    )
  },
  {
    id: 'forest-gradient',
    name: 'Forest Gradient',
    category: 'shapes',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-green-300 via-green-500 to-green-700 rounded-full"></div>
    )
  },
  {
    id: 'sunset-gradient',
    name: 'Sunset Gradient',
    category: 'shapes',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-orange-300 via-red-400 to-pink-500 rounded-full"></div>
    )
  },
  {
    id: 'ocean-gradient',
    name: 'Ocean Gradient',
    category: 'shapes',
    component: (
      <div className="w-full h-full bg-gradient-to-br from-cyan-300 via-blue-400 to-blue-600 rounded-full"></div>
    )
  }
]

export const getAvatarById = (id: string): AvatarPreset | null => {
  return avatarPresets.find(preset => preset.id === id) || null
}

export const getAvatarsByCategory = (category: AvatarPreset['category']): AvatarPreset[] => {
  return avatarPresets.filter(preset => preset.category === category)
}

export const categories = [
  { key: 'animals' as const, label: 'Animals', icon: '🐱' },
  { key: 'nature' as const, label: 'Nature', icon: '🌳' },
  { key: 'professional' as const, label: 'Professional', icon: '💼' },
  { key: 'shapes' as const, label: 'Shapes', icon: '🔸' },
  { key: 'abstract' as const, label: 'Abstract', icon: '✨' }
]